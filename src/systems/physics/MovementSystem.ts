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

import type { IntentSOA } from '@/core/intent/interfaces/ShipIntent';

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

const FALLBACK_DIRECTIONS = {
  forward: [0, -1],
  strafeLeft: [-1, 0],
  strafeRight: [1, 0],
} as const;


export class MovementSystem {
  private readonly fallbackThrustPower = 10;
  private readonly baseThrust = 5;
  private externalImpulse = { x: 0, y: 0 };

  private afterburnerCharge = 0; // 0.0 to 1.0, tracks how "charged up" the afterburner is
  private wasAfterburnerActiveLastFrame = false; // (declare once at class level)

  private readonly thrustGroups: Record<
    ThrustDirection,
    Array<{ idx: number, coord: GridCoord; power: number; rotation: number }>
  > = {
    forward: [],
    strafeLeft: [],
    strafeRight: [],
  };

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

  private clearThrustGroups(): void {
    this.thrustGroups.forward.length = 0;
    this.thrustGroups.strafeLeft.length = 0;
    this.thrustGroups.strafeRight.length = 0;
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

    // === Update afterburner state ===
    const justActivatedAfterburner = this.updateAfterburnerCharge(dt);
    const afterburnerMultipliers = this.getAfterburnerMultipliers();

    // === Intent flags for ship state ===
    this.ship.setThrusting(thrustForward);
    this.ship.setStrafingLeft(strafeLeft);
    this.ship.setStrafingRight(strafeRight);

    // === Apply accumulated external impulses ===
    velocity.x += this.externalImpulse.x;
    velocity.y += this.externalImpulse.y;
    this.externalImpulse.x = 0;
    this.externalImpulse.y = 0;

    // === Mass + angular scaling factors ===
    const mass = this.ship.getTotalMass();
    const angularScale = Math.min(1, Math.pow(BASE_MASS / Math.max(mass, 1), ANGULAR_MASS_SCALE_EXPONENT));

    this.clearThrustGroups();
    const thrustGroups = this.thrustGroups;

    let rawTurnPower = BASE_TURN_POWER;
    const store = this.ship['blockManager'].getBlockStore();

    // === Engines: populate thrust groups entirely via SOA ===
    for (const idx of this.ship.getEngineIndices()) {
      if (!store.isAllocated(idx)) continue;
      if (store.canThrust[idx] === 0) continue;

      const thrustPower = store.thrustPower[idx];
      const localRot = store.localRotation[idx];

      const dir = classifyThrustDirection(localRot);
      if (dir) {
        thrustGroups[dir].push({
          idx,
          coord: { x: store.localX[idx], y: store.localY[idx] },
          power: thrustPower,
          rotation: localRot ?? 0,
        });
      }
    }

    // === Fins: accumulate turn power via SOA ===
    for (const idx of this.ship.getFinIndices()) {
      if (!store.isAllocated(idx)) continue;
      rawTurnPower += store.turnPower[idx];
    }

    // === Apply passive bonuses for turn power ===
    rawTurnPower *= this.ship.getPassiveBonus('fin-turn-power') + this.ship.getTurnPowerMultiplier();

    // === Compute angular velocity target ===
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

      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;

      targetAngularVelocity = delta * ROTATIONAL_ASSIST_STRENGTH * afterburnerMultipliers.turning;
      targetAngularVelocity = Math.max(-maxAngularSpeed, Math.min(targetAngularVelocity, maxAngularSpeed));
    } else {
      if (rotateLeft) targetAngularVelocity = -maxAngularSpeed;
      else if (rotateRight) targetAngularVelocity = maxAngularSpeed;
    }

    const angularDelta = targetAngularVelocity - transform.angularVelocity;
    transform.angularVelocity += angularDelta * ROTATIONAL_ASSIST_STRENGTH * afterburnerMultipliers.turning * dt;
    transform.angularVelocity = Math.max(-maxAngularSpeed, Math.min(transform.angularVelocity, maxAngularSpeed));

    // === Forward thrust application (unchanged except for data feeding) ===
    const cameraBounds = Camera.getInstance().getViewportBounds();
    const playerShip = ShipRegistry.getInstance().getPlayerShip();

    if (thrustForward && playerShip) {
      this.applyDirectionalThrust(
        dt,
        'forward',
        thrustGroups.forward,
        transform,
        position,
        afterburnerMultipliers,
        justActivatedAfterburner,
        cameraBounds,
        playerShip
      );
    }

    // === Inertial dampening when no thrust ===
    if (!thrustForward && !strafeLeft && !strafeRight) {
      const dampen = Math.pow(INERTIAL_DAMPENING_FACTOR, dt);
      velocity.x *= dampen;
      velocity.y *= dampen;
    }

    // === Braking logic (unchanged except thrustGroups now SOA-fed) ===
    if (brake) {
      const vx = velocity.x;
      const vy = velocity.y;
      const speedSq = vx * vx + vy * vy;

      if (speedSq > 0.0001) {
        const speed = Math.sqrt(speedSq);
        const vxNorm = vx / speed;
        const vyNorm = vy / speed;

        const totalThrustPower =
          this.fallbackThrustPower +
          thrustGroups.forward.reduce((sum, t) => sum + t.power, 0) +
          thrustGroups.strafeLeft.reduce((sum, t) => sum + t.power, 0) +
          thrustGroups.strafeRight.reduce((sum, t) => sum + t.power, 0);

        const brakingForce = totalThrustPower * dt * BRAKING_FORCE_MULTIPLIER;

        const newVx = vx - vxNorm * brakingForce;
        const newVy = vy - vyNorm * brakingForce;
        const dot = newVx * vx + newVy * vy;

        if (dot < 0) {
          velocity.x = 0;
          velocity.y = 0;
        } else {
          velocity.x = newVx;
          velocity.y = newVy;
        }
      }
    }

    // === Collision resolution ===
    if (this.collisionSystem) {
      this.collisionSystem.resolveCollisions(this.ship);

      const v = transform.velocity;
      v.x = Math.round(v.x * 1000) / 1000;
      v.y = Math.round(v.y * 1000) / 1000;
    }

    // === Integrate motion ===
    const { thrustPowerMulti = 1, turnPowerMulti = 1 } = this.ship.getAffixes() ?? {};
    transform.rotation += transform.angularVelocity * dt * turnPowerMulti;
    position.x += velocity.x * dt * thrustPowerMulti;
    position.y += velocity.y * dt * thrustPowerMulti;

    // === Aura light sync ===
    const auraId = this.ship.getLightAuraId?.();
    if (auraId) {
      try {
        LightingOrchestrator.getInstance().updateLight(auraId, position);
      } catch (e) {
        console.warn(`[MovementSystem] Aura light update failed for ship ${this.ship.id}`, e);
      }
    }

    // === Update block world positions if ship moved ===
    if (this.ship.hasMovedSinceLastUpdate?.() !== false) {
      this.ship.updateBlockPositions();
      this.ship.markTransformChecked();
    }
  }

  private applyDirectionalThrust(
    dt: number,
    thrustDirection: ThrustDirection,
    thrusters: { idx: number; coord: GridCoord; power: number; rotation: number }[],
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

    const [fx, fy] = FALLBACK_DIRECTIONS[thrustDirection];
    const fallbackX = fx * cosRot - fy * sinRot;
    const fallbackY = fx * sinRot + fy * cosRot;

    // === Fallback Thrust ===
    const fallbackPower = this.fallbackThrustPower;
    totalThrustX += fallbackX * fallbackPower;
    totalThrustY += fallbackY * fallbackPower;

    // === Max Speed Computation with Diminishing Returns ===
    const engineCount = thrusters.length + 1;
    const totalEngineThrust = thrusters.reduce((sum, t) => sum + t.power, 0);
    const totalThrustPower = (totalEngineThrust + fallbackPower) * (this.ship.getPassiveBonus('engine-thrust') + this.ship.getThrustMultiplier());

    const baseMaxSpeed = computeBaseMaxSpeed(totalThrustPower, engineCount);

    const mass = this.ship.getTotalMass();
    const speedScale = Math.min(1, Math.pow(BASE_MASS / Math.max(mass, 1), LINEAR_MASS_SCALE_EXPONENT));
    const maxSpeed = baseMaxSpeed * afterburnerMultipliers.speed * speedScale;

    // === Afterburner FX Context
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

    // === BlockStore access for thrust + particles ===
    const store = this.ship['blockManager'].getBlockStore();

    for (const { idx, coord, power, rotation: blockRotation } of thrusters) {
      if (!store.isAllocated(idx)) continue;

      // Inline thrust vector (local block → world)
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
          idx,                     // SOA index for particle systems
          coord,                   // Local coordinate (for offsets)
          rotation: blockRotation, // Local rotation
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

    // === Apply impulse (scaled by accel & afterburner)
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

    // === Soft speed cap (project velocity along thrust dir)
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

  public setSOAIntent(soa: IntentSOA, idx: number): void {
    this.currentIntent.thrustForward = !!soa.thrustForward[idx];
    this.currentIntent.brake = !!soa.brake[idx];
    this.currentIntent.rotateLeft = !!soa.rotateLeft[idx];
    this.currentIntent.rotateRight = !!soa.rotateRight[idx];
    this.currentIntent.strafeLeft = !!soa.strafeLeft[idx];
    this.currentIntent.strafeRight = !!soa.strafeRight[idx];

    // Force-disable turnToAngle for AI (never used)
    this.currentIntent.turnToAngle = undefined;

    this.currentIntent.afterburner = !!soa.afterburner[idx];
  }
}

function computeBaseMaxSpeed(
  totalThrustPower: number,
  engineCount: number
): number {
  if (engineCount <= DIMINISHING_START) {
    return totalThrustPower * SPEED_PER_THRUST_UNIT;
  }

  const basePower = (totalThrustPower / engineCount) * DIMINISHING_START;
  const excessEngines = engineCount - DIMINISHING_START;
  const excessPowerPerEngine = totalThrustPower / engineCount;
  const effectivenessMultiplier = 1 / (1 + DIMINISHING_RATE * excessEngines);
  const diminishedExcessPower = excessPowerPerEngine * excessEngines * effectivenessMultiplier;
  return (basePower + diminishedExcessPower) * SPEED_PER_THRUST_UNIT;
}
