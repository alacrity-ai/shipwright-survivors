// src/systems/physics/MovementSystem.ts

import { classifyThrustDirection } from '@/core/intent/interfaces/helpers/movementHelpers';
import { BlockObjectCollisionSystem } from '@/systems/physics/BlockObjectCollisionSystem';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { Camera } from '@/core/Camera';

import { GlobalEventBus } from '@/core/EventBus';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { ThrustDirection } from '@/core/intent/interfaces/helpers/movementHelpers';
import type { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';
import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';

const BASE_MASS = 500;
const LINEAR_MASS_SCALE_EXPONENT = 0.4; // Controls how strongly mass reduces linear acceleration and top speed

const BASE_TURN_POWER = 2;
const MAXIMUM_TURN_POWER = 12;
const MAXIMUM_ROTATION_SPEED = 15;
const INERTIAL_DAMPENING_FACTOR = 0.5; // 0.50 per second (~2% velocity loss/sec)
const STEERING_ASSIST_STRENGTH = 3;   // default 0.5 : higher = more aggressive directional realignment

const ROTATIONAL_ASSIST_STRENGTH = 2; // Higher = more snap
const FIN_DIMINISHING_EXPONENT = 0.94; // 1.0 = linear, <1.0 = diminishing | diminishes returns on fins
const BASE_ROTATION_STRENGTH = 0.6; // Controls base cap on angular speed before multipliers
const ANGULAR_MASS_SCALE_EXPONENT = 0.6; // Rotation-specific scaling factor derived from mass. Mass slows down rotation.

const BRAKING_FORCE_MULTIPLIER = 1.0; // Lower = weaker braking, higher = more aggressive

// Engine speed cap and scaling
const SPEED_PER_THRUST_UNIT = 1; // Tunable: how much each unit of thrustPower contributes to max speed
const DIMINISHING_START = 8;
const DIMINISHING_RATE = 0.15;

// Afterburner constants
const AFTERBURNER_SPEED_MULTIPLIER = 1.6; // Max speed multiplier when afterburner is fully active
const AFTERBURNER_ACCEL_MULTIPLIER = 2.2; // Extra acceleration while afterburning
const AFTERBURNER_TURNING_MULTIPLIER = 1.4; // Extra turning assist while afterburning
const AFTERBURNER_RAMP_UP_RATE = 3.5; // How fast afterburner ramps up (per second)
const AFTERBURNER_RAMP_DOWN_RATE = 1.5; // How fast afterburner ramps down (per second)

export class MovementSystem {
  private readonly fallbackThrustPower = 10;
  private readonly baseThrust = 5;
  private externalImpulse = { x: 0, y: 0 };

  private afterburnerCharge = 0; // 0.0 to 1.0, tracks how "charged up" the afterburner is
  private wasAfterburnerActiveLastFrame = false; // (declare once at class level)

  private currentIntent: MovementIntent = {
    thrustForward: false,
    brake: false,
    rotateLeft: false,
    rotateRight: false,
    strafeLeft: false,
    strafeRight: false,
  };

  constructor(
    private readonly ship: Ship,
    private readonly emitter: ThrusterEmitter,
    private readonly collisionSystem: BlockObjectCollisionSystem | null
  ) {}

  public setIntent(intent: MovementIntent): void {
    this.currentIntent = intent;
  }

  public applyExternalImpulse(dx: number, dy: number): void {
    this.externalImpulse.x += dx;
    this.externalImpulse.y += dy;
  }

  public getAfterburnerCharge(): number {
    return this.afterburnerCharge;
  }

  private rotateVector(x: number, y: number, angleRad: number): { x: number; y: number } {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return {
      x: x * cos - y * sin,
      y: x * sin + y * cos
    };
  }

  private getBlockThrustDirection(blockRotationDeg: number): { x: number; y: number } {
    const blockFacingRad = blockRotationDeg * (Math.PI / 180);
    
    const thrustX = Math.sin(blockFacingRad);
    const thrustY = -Math.cos(blockFacingRad);
    
    return { x: thrustX, y: thrustY };
  }

  private updateAfterburnerCharge(dt: number): boolean {
    const afterburner = this.ship.getAfterburnerComponent();
    const intentActive = this.currentIntent.afterburner ?? false;

    let justActivated = false;

    if (afterburner) {
      afterburner.setActive(intentActive);
      afterburner.update(dt);

      const isActiveNow = afterburner.isActive();

      // Rising edge detection for after afterburner was just turned on
      justActivated = isActiveNow && !this.wasAfterburnerActiveLastFrame;

      this.wasAfterburnerActiveLastFrame = isActiveNow;

      if (isActiveNow) {
        this.afterburnerCharge = Math.min(1, this.afterburnerCharge + AFTERBURNER_RAMP_UP_RATE * dt);
      } else {
        this.afterburnerCharge = Math.max(0, this.afterburnerCharge - AFTERBURNER_RAMP_DOWN_RATE * dt);
      }
    } else {
      this.afterburnerCharge = 0;
      this.wasAfterburnerActiveLastFrame = false;
    }

    return justActivated;
  }

  private getAfterburnerMultipliers(): { speed: number; accel: number; turning: number } {
    const charge = this.afterburnerCharge;
    const speedMulti = this.ship.getAfterburnerSpeedMultiplier() || AFTERBURNER_SPEED_MULTIPLIER;
    const accelerationMulti = this.ship.getAfterburnerAccelMultiplier() || AFTERBURNER_ACCEL_MULTIPLIER;

    return {
      speed: 1 + (speedMulti - 1) * charge,
      accel: 1 + (accelerationMulti - 1) * charge,
      turning: 1 + (AFTERBURNER_TURNING_MULTIPLIER - 1) * charge
    };
  }

  public update(dt: number): void {
    const transform = this.ship.getTransform();
    const { position, velocity } = transform;

    const {
      rotateLeft,
      rotateRight,
      thrustForward,
      brake,
      strafeLeft,
      strafeRight,
    } = this.currentIntent;

    // === Update afterburner charge ===
    const justActivatedAfterburner = this.updateAfterburnerCharge(dt);
    const afterburnerMultipliers = this.getAfterburnerMultipliers();

    // === Update Ship Movement Flags ===
    this.ship.setThrusting(thrustForward);
    this.ship.setStrafingLeft(strafeLeft);
    this.ship.setStrafingRight(strafeRight);

    // === Apply any external impulses from prior frame ===
    velocity.x += this.externalImpulse.x;
    velocity.y += this.externalImpulse.y;

    // Clear after applying
    this.externalImpulse.x = 0;
    this.externalImpulse.y = 0;

    // === Evaluate mass and scaling ===
    const mass = this.ship.getTotalMass();
    const angularScale = Math.min(1, Math.pow(BASE_MASS / Math.max(mass, 1), ANGULAR_MASS_SCALE_EXPONENT));

    const thrustGroups: Record<ThrustDirection, { coord: GridCoord; power: number; rotation: number }[]> = {
      forward: [],
      strafeLeft: [],
      strafeRight: [],
    };

    let rawTurnPower = BASE_TURN_POWER;

    for (const block of this.ship.getEngineBlocks()) {
      const behavior = block.type.behavior;
      const power = behavior?.thrustPower ?? this.baseThrust;
      const dir = classifyThrustDirection(block.rotation ?? 0);
      if (dir) {
        const coord = this.ship.getBlockCoord(block);
        if (coord) {
          thrustGroups[dir].push({ coord, power, rotation: block.rotation ?? 0 });
        }
      }
    }

    for (const block of this.ship.getFinBlocks()) {
      rawTurnPower += block.type.behavior?.turnPower ?? 0;
    }

    // === Angular motion with assist (enhanced by afterburner) ===
    const totalTurnPower = Math.min(MAXIMUM_TURN_POWER, Math.pow(rawTurnPower, FIN_DIMINISHING_EXPONENT));

    const maxAngularSpeed = Math.min(
      totalTurnPower * angularScale * BASE_ROTATION_STRENGTH * afterburnerMultipliers.turning,
      MAXIMUM_ROTATION_SPEED
    );
    let targetAngularVelocity = 0;

    if (this.currentIntent.turnToAngle !== undefined) {
      const { rotation } = transform;
      const target = this.currentIntent.turnToAngle;

      let delta = target - rotation;

      // Wrap to [-π, π] for shortest rotation direction
      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;

      // Use rotation assist proportional to angle (enhanced by afterburner)
      targetAngularVelocity = delta * ROTATIONAL_ASSIST_STRENGTH * afterburnerMultipliers.turning;
      targetAngularVelocity = Math.max(
        -maxAngularSpeed,
        Math.min(targetAngularVelocity, maxAngularSpeed)
      );
    } else {
      if (rotateLeft) targetAngularVelocity = -maxAngularSpeed;
      else if (rotateRight) targetAngularVelocity = maxAngularSpeed;
    }

    const angularDelta = targetAngularVelocity - transform.angularVelocity;
    transform.angularVelocity += angularDelta * ROTATIONAL_ASSIST_STRENGTH * afterburnerMultipliers.turning * dt;
    transform.angularVelocity = Math.max(
      -maxAngularSpeed,
      Math.min(transform.angularVelocity, maxAngularSpeed)
    );

    const cameraBounds = Camera.getInstance().getViewportBounds();
    const playerShip = ShipRegistry.getInstance().getPlayerShip();

    // === Linear thrust
    if (thrustForward && playerShip) {
      this.applyDirectionalThrust(dt, 'forward', thrustGroups.forward, transform, position, afterburnerMultipliers, justActivatedAfterburner, cameraBounds, playerShip);
    }
    // Deprecated
    // if (strafeLeft) {
    //   this.applyDirectionalThrust(dt, 'strafeLeft', thrustGroups.strafeLeft, transform, position, afterburnerMultipliers, justActivatedAfterburner);
    // }
    // if (strafeRight) {
    //   this.applyDirectionalThrust(dt, 'strafeRight', thrustGroups.strafeRight, transform, position, afterburnerMultipliers, justActivatedAfterburner);
    // }

    // === Inertial dampening
    if (!thrustForward && !strafeLeft && !strafeRight) {
      const dampen = Math.pow(INERTIAL_DAMPENING_FACTOR, dt);
      velocity.x *= dampen;
      velocity.y *= dampen;
    }

    // === Braking logic
    if (brake) {
      const speed = Math.hypot(velocity.x, velocity.y);
      if (speed > 0) {
        const vxNorm = velocity.x / speed;
        const vyNorm = velocity.y / speed;
        const allThrusters = [...thrustGroups.forward, ...thrustGroups.strafeLeft, ...thrustGroups.strafeRight];
        const totalThrustPower = allThrusters.reduce((sum, t) => sum + t.power, 0) + this.fallbackThrustPower;
        const brakingForce = totalThrustPower * dt * BRAKING_FORCE_MULTIPLIER;

        const newVx = velocity.x - vxNorm * brakingForce;
        const newVy = velocity.y - vyNorm * brakingForce;
        const dot = newVx * velocity.x + newVy * velocity.y;

        if (dot < 0) {
          velocity.x = 0;
          velocity.y = 0;
        } else {
          velocity.x = newVx;
          velocity.y = newVy;
        }
      }
    }

    // === Step 1: Resolve collisions *before* integration
    if (this.collisionSystem) {
      this.collisionSystem.resolveCollisions(this.ship);

      // Optional: Clamp very small residuals to zero
      const v = transform.velocity;
      v.x = Math.round(v.x * 1000) / 1000;
      v.y = Math.round(v.y * 1000) / 1000;
    }

    // === Step 2: Integrate motion (velocity → position)
    const {
      thrustPowerMulti = 1,
      turnPowerMulti = 1,
    } = this.ship.getAffixes() ?? {};

    transform.rotation += transform.angularVelocity * dt * turnPowerMulti;
    position.x += velocity.x * dt * thrustPowerMulti;
    position.y += velocity.y * dt * thrustPowerMulti;

    // === Update Aura Light Position ===
    const auraId = this.ship.getLightAuraId?.();
    if (auraId) {
      try {
        LightingOrchestrator.getInstance().updateLight(auraId, position);
      } catch (e) {
        console.warn(`[MovementSystem] Aura light update failed for ship ${this.ship.id}`, e);
      }
    }
    
    // === Step 3: Update world-space block positions
    if (this.ship.hasMovedSinceLastUpdate?.() !== false) {
      this.ship.updateBlockPositions();
      this.ship.markTransformChecked();
    }
  }

  // Deprecated
  // private applyDirectionalThrust(
  //   dt: number,
  //   thrustDirection: ThrustDirection,
  //   thrusters: { coord: GridCoord; power: number; rotation: number }[],
  //   transform: BlockEntityTransform,
  //   position: { x: number; y: number },
  //   afterburnerMultipliers: { speed: number; accel: number; turning: number },
  //   flashOnThisFrame: boolean
  // ): void {
  //   let totalThrustX = 0;
  //   let totalThrustY = 0;

  //   // === Apply fallback to ALL directions equally ===
  //   const fallbackPower = this.fallbackThrustPower;
  //   const engineCount = thrusters.length + 1;
  //   const baseUnit = SPEED_PER_THRUST_UNIT;

  //   const totalEngineThrust = thrusters.reduce((sum, t) => sum + t.power, 0);
  //   const totalThrustPower = totalEngineThrust + fallbackPower;

  //   const baseMaxSpeed = (() => {
  //     if (engineCount <= DIMINISHING_START) return totalThrustPower * baseUnit;

  //     const basePower = (totalThrustPower / engineCount) * DIMINISHING_START;
  //     const excessEngines = engineCount - DIMINISHING_START;
  //     const excessPowerPerEngine = totalThrustPower / engineCount;
  //     const effectivenessMultiplier = 1 / (1 + DIMINISHING_RATE * excessEngines);
  //     const diminishedExcessPower = excessPowerPerEngine * excessEngines * effectivenessMultiplier;
  //     return (basePower + diminishedExcessPower) * baseUnit;
  //   })();

  //   // Apply afterburner speed multiplier
  //   const mass = this.ship.getTotalMass();
  //   const speedScale = Math.min(1, Math.pow(BASE_MASS / Math.max(mass, 1), LINEAR_MASS_SCALE_EXPONENT));
  //   const maxSpeed = baseMaxSpeed * afterburnerMultipliers.speed * speedScale;


  //   // === Apply fallback thrust in correct direction ===
  //   const fallbackDirection = (() => {
  //     switch (thrustDirection) {
  //       case 'forward': return this.rotateVector(0, -1, transform.rotation);
  //       case 'strafeLeft': return this.rotateVector(-1, 0, transform.rotation);
  //       case 'strafeRight': return this.rotateVector(1, 0, transform.rotation);
  //     }
  //   })();
  //   totalThrustX += fallbackDirection.x * fallbackPower;
  //   totalThrustY += fallbackDirection.y * fallbackPower;

  //   // Determine if we're near the player ship (For thruster effects)
  //   const playerShip = ShipRegistry.getInstance().getPlayerShip();
  //   let emit = false;
  //   let afterburnerJustActivated = false;
  //   let pulseJustActivated = false;
  //   let isPulsing = false;
  //   let superPulseJustActivated = false;

  //   if (playerShip && playerShip !== this.ship) {
  //     const cameraBounds = Camera.getInstance().getViewportBounds();
  //     const MARGIN = 100;

  //     const minX = cameraBounds.x - MARGIN;
  //     const minY = cameraBounds.y - MARGIN;
  //     const maxX = cameraBounds.x + cameraBounds.width + MARGIN;
  //     const maxY = cameraBounds.y + cameraBounds.height + MARGIN;

  //     const center = this.ship.getTransform().position;
  //     emit = center.x >= minX && center.x <= maxX &&
  //           center.y >= minY && center.y <= maxY;
  //   } else {
  //     afterburnerJustActivated = this.ship.getAfterburnerComponent()?.wasAfterburnerJustActivated() ?? false;
  //     pulseJustActivated = this.ship.getAfterburnerComponent()?.wasPulseJustActivated() ?? false;
  //     isPulsing = this.ship.getAfterburnerComponent()?.isPulsing() ?? false;
  //     superPulseJustActivated = this.ship.getAfterburnerComponent()?.wasSuperPulseJustActivated() ?? false;
  //     emit = true; // Always emit if it's the player ship
  //   }

  //   // Sound effects and screen shake for afterburner/pulse use
  //   if (this.ship.getIsPlayerShip()) {
  //     if (pulseJustActivated || superPulseJustActivated || afterburnerJustActivated) {
  //       this.emitPulseSoundAndShake(this.ship.id, pulseJustActivated, superPulseJustActivated);
  //     }
  //     // Special light effect on ship for super pulse
  //     if (superPulseJustActivated) {
  //       createLightFlash(this.ship.getTransform().position.x, this.ship.getTransform().position.y, 300, 1.5, 0.5, '#ffffff');
  //     }
  //   }

  //   // === Apply thruster force
  //   for (const { coord, power, rotation: blockRotation } of thrusters) {
  //     const block = this.ship.getBlock(coord);
  //     if (!block) continue;

  //     const localThrust = this.getBlockThrustDirection(blockRotation);
  //     const worldThrust = this.rotateVector(localThrust.x, localThrust.y, transform.rotation);

  //     totalThrustX += worldThrust.x * power;
  //     totalThrustY += worldThrust.y * power;

  //     if (emit) {
  //       this.emitter.emit({
  //         coord,
  //         block,
  //         blockRotation,
  //         shipRotation: transform.rotation,
  //         shipPosition: position,
  //         afterBurner: this.ship.getAfterburnerComponent()?.isActive() ?? false,
  //         afterBurnerJustActivated: flashOnThisFrame,
  //         isPulsing: isPulsing,
  //         pulseJustActivated: pulseJustActivated,
  //         superPulseJustActivated: superPulseJustActivated
  //       });
  //     }
  //   }

  //   // === Apply impulse (enhanced by afterburner acceleration) ===
  //   const accelScale = Math.min(1, Math.pow(BASE_MASS / Math.max(mass, 1), LINEAR_MASS_SCALE_EXPONENT));
  //   const impulseX = totalThrustX * dt * accelScale * afterburnerMultipliers.accel;
  //   const impulseY = totalThrustY * dt * accelScale * afterburnerMultipliers.accel;

  //   transform.velocity.x += impulseX;
  //   transform.velocity.y += impulseY;

  //   // === Directional assist (enhanced by afterburner) ===
  //   const speed = Math.sqrt(transform.velocity.x ** 2 + transform.velocity.y ** 2);
  //   if (speed > 0) {
  //     const vxNorm = transform.velocity.x / speed;
  //     const vyNorm = transform.velocity.y / speed;

  //     const steerX = fallbackDirection.x - vxNorm;
  //     const steerY = fallbackDirection.y - vyNorm;

  //     const steeringAssist = STEERING_ASSIST_STRENGTH * afterburnerMultipliers.turning;
  //     transform.velocity.x += steerX * steeringAssist * speed * dt;
  //     transform.velocity.y += steerY * steeringAssist * speed * dt;
  //   }

  //   // === Soft speed cap (per-directional component limiting) ===
  //   const velocityInThrustDir =
  //     transform.velocity.x * fallbackDirection.x +
  //     transform.velocity.y * fallbackDirection.y;

  //   if (velocityInThrustDir > maxSpeed) {
  //     const excessRatio = velocityInThrustDir / maxSpeed;
  //     const softCapMultiplier = 1 / (1 + 0.5 * (excessRatio - 1));

  //     const excessVelocity =
  //       velocityInThrustDir - (velocityInThrustDir * softCapMultiplier);

  //     // Subtract excess along the thrust direction vector
  //     transform.velocity.x -= fallbackDirection.x * excessVelocity;
  //     transform.velocity.y -= fallbackDirection.y * excessVelocity;
  //   }
  // }

  private applyDirectionalThrust(
    dt: number,
    thrustDirection: ThrustDirection,
    thrusters: { coord: GridCoord; power: number; rotation: number }[],
    transform: BlockEntityTransform,
    position: { x: number; y: number },
    afterburnerMultipliers: { speed: number; accel: number; turning: number },
    flashOnThisFrame: boolean,
    cameraBounds: { x: number; y: number; width: number; height: number }, // Prepassed once per frame
    playerShip: Ship // Prepassed once per frame
  ): void {
    let totalThrustX = 0;
    let totalThrustY = 0;

    const cosRot = Math.cos(transform.rotation);
    const sinRot = Math.sin(transform.rotation);

    const fallbackDir = (() => {
      switch (thrustDirection) {
        case 'forward': return { x: 0, y: -1 };
        case 'strafeLeft': return { x: -1, y: 0 };
        case 'strafeRight': return { x: 1, y: 0 };
      }
    })();
    const fallbackX = fallbackDir.x * cosRot - fallbackDir.y * sinRot;
    const fallbackY = fallbackDir.x * sinRot + fallbackDir.y * cosRot;

    // === Fallback Thrust ===
    const fallbackPower = this.fallbackThrustPower;
    totalThrustX += fallbackX * fallbackPower;
    totalThrustY += fallbackY * fallbackPower;

    // === Max Speed Computation with Diminishing Returns ===
    const engineCount = thrusters.length + 1;
    const totalEngineThrust = thrusters.reduce((sum, t) => sum + t.power, 0);
    const totalThrustPower = totalEngineThrust + fallbackPower;

    const baseMaxSpeed = (() => {
      if (engineCount <= DIMINISHING_START) return totalThrustPower * SPEED_PER_THRUST_UNIT;

      const basePower = (totalThrustPower / engineCount) * DIMINISHING_START;
      const excessEngines = engineCount - DIMINISHING_START;
      const excessPowerPerEngine = totalThrustPower / engineCount;
      const effectivenessMultiplier = 1 / (1 + DIMINISHING_RATE * excessEngines);
      const diminishedExcessPower = excessPowerPerEngine * excessEngines * effectivenessMultiplier;
      return (basePower + diminishedExcessPower) * SPEED_PER_THRUST_UNIT;
    })();

    const mass = this.ship.getTotalMass();
    const speedScale = Math.min(1, Math.pow(BASE_MASS / Math.max(mass, 1), LINEAR_MASS_SCALE_EXPONENT));
    const maxSpeed = baseMaxSpeed * afterburnerMultipliers.speed * speedScale;

    // === Afterburner FX Context (cached from movementSystem)
    const isPlayer = this.ship === playerShip;
    const shipCenter = this.ship.getTransform().position;
    const MARGIN = 100;

    const emit = isPlayer ||
      (shipCenter.x >= cameraBounds.x - MARGIN &&
      shipCenter.x <= cameraBounds.x + cameraBounds.width + MARGIN &&
      shipCenter.y >= cameraBounds.y - MARGIN &&
      shipCenter.y <= cameraBounds.y + cameraBounds.height + MARGIN);

    const afterburner = this.ship.getAfterburnerComponent();
    const afterburnerActive = afterburner?.isActive() ?? false;
    const pulseJustActivated = afterburner?.wasPulseJustActivated() ?? false;
    const superPulseJustActivated = afterburner?.wasSuperPulseJustActivated() ?? false;
    const isPulsing = afterburner?.isPulsing() ?? false;

    // === Effects / Shake for player
    if (isPlayer) {
      if (pulseJustActivated || superPulseJustActivated || afterburner?.wasAfterburnerJustActivated()) {
        this.emitPulseSoundAndShake(this.ship.id, pulseJustActivated, superPulseJustActivated);
      }

      if (superPulseJustActivated) {
        createLightFlash(position.x, position.y, 300, 1.5, 0.5, '#ffffff');
      }
    }

    // === Apply per-thruster impulse + emit particles
    for (const { coord, power, rotation: blockRotation } of thrusters) {
      const block = this.ship.getBlock(coord);
      if (!block) continue;

      // Inline getBlockThrustDirection
      const localX = 0;
      const localY = -1;
      const cosBlock = Math.cos(blockRotation);
      const sinBlock = Math.sin(blockRotation);

      const dirX = localX * cosBlock - localY * sinBlock;
      const dirY = localX * sinBlock + localY * cosBlock;

      const worldX = dirX * cosRot - dirY * sinRot;
      const worldY = dirX * sinRot + dirY * cosRot;

      totalThrustX += worldX * power;
      totalThrustY += worldY * power;

      if (emit) {
        this.emitter.emit({
          coord,
          block,
          blockRotation,
          shipRotation: transform.rotation,
          shipPosition: position,
          afterBurner: afterburnerActive,
          afterBurnerJustActivated: flashOnThisFrame,
          isPulsing,
          pulseJustActivated,
          superPulseJustActivated,
        });
      }
    }

    // === Apply impulse (accel scaled)
    const accelScale = Math.min(1, Math.pow(BASE_MASS / Math.max(mass, 1), LINEAR_MASS_SCALE_EXPONENT));
    transform.velocity.x += totalThrustX * dt * accelScale * afterburnerMultipliers.accel;
    transform.velocity.y += totalThrustY * dt * accelScale * afterburnerMultipliers.accel;

    // === Directional assist
    const vx = transform.velocity.x;
    const vy = transform.velocity.y;
    const speedSq = vx * vx + vy * vy;

    if (speedSq > 0.01) {
      const speedInv = 1 / Math.sqrt(speedSq);
      const vxNorm = vx * speedInv;
      const vyNorm = vy * speedInv;

      const steerX = fallbackX - vxNorm;
      const steerY = fallbackY - vyNorm;

      const assist = STEERING_ASSIST_STRENGTH * afterburnerMultipliers.turning;
      transform.velocity.x += steerX * assist * Math.sqrt(speedSq) * dt;
      transform.velocity.y += steerY * assist * Math.sqrt(speedSq) * dt;
    }

    // === Soft speed cap (project onto thrust direction)
    const velocityInDir = transform.velocity.x * fallbackX + transform.velocity.y * fallbackY;
    if (velocityInDir > maxSpeed) {
      const excessRatio = velocityInDir / maxSpeed;
      const softCap = 1 / (1 + 0.5 * (excessRatio - 1));
      const excess = velocityInDir - (velocityInDir * softCap);
      transform.velocity.x -= fallbackX * excess;
      transform.velocity.y -= fallbackY * excess;
    }
  }

  private emitPulseSoundAndShake(
    ownerShipId: string,
    wasPulse: boolean = false,
    wasSuperPulse: boolean = false
  ): void {
    const shipRegistry = ShipRegistry.getInstance();
    const playerShip = shipRegistry.getPlayerShip();
    const ownerShip = shipRegistry.getById(ownerShipId);

    // === Determine SFX based on tier
    // TODO : Get specific sounds
    let soundFile = 'assets/sounds/sfx/explosions/afterburner_00.wav';
    if (wasSuperPulse) {
      soundFile = 'assets/sounds/sfx/ui/sub_00.wav';
    } else if (wasPulse) {
      soundFile = 'assets/sounds/sfx/explosions/afterburner_00.wav';
    }

    // === Spatial SFX
    if (ownerShip) {
      playSpatialSfx(ownerShip, playerShip, {
        file: soundFile,
        channel: 'sfx',
        baseVolume: 1,
        pitchRange: [1.0, 1.3],
        volumeJitter: 0.15,
        maxSimultaneous: 5,
      });

      if (wasSuperPulse) {
        playSpatialSfx(ownerShip, playerShip, {
          file: 'assets/sounds/sfx/explosions/superpulse_00.wav',
          channel: 'sfx',
          baseVolume: 1,
          pitchRange: [1.1, 1.4],
          volumeJitter: 0.1,
          maxSimultaneous: 5,
        });
      }
    }

    // === Screen Shake for Player
    if (ownerShip && ownerShip === playerShip) {
      let strength = 4;
      let duration = 0.16;

      if (wasPulse) {
        strength = 6;
        duration = 0.18;
      }
      if (wasSuperPulse) {
        strength = 9;
        duration = 0.20;
      }

      GlobalEventBus.emit('camera:shake', {
        strength,
        duration,
        frequency: 10,
      });
    }
  }
}