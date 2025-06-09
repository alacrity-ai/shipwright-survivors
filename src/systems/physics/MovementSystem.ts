// src/systems/physics/MovementSystem.ts

import { classifyThrustDirection } from '@/core/intent/interfaces/helpers/movementHelpers';
import { BlockObjectCollisionSystem } from '@/systems/physics/BlockObjectCollisionSystem';

import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { ThrustDirection } from '@/core/intent/interfaces/helpers/movementHelpers';
import type { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';
import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';

const BASE_MASS = 200;
const INERTIAL_DAMPENING_FACTOR = 0.5; // 0.50 per second (~2% velocity loss/sec)
const STEERING_ASSIST_STRENGTH = 0.6;   // default 0.5 : higher = more aggressive directional realignment
const ROTATIONAL_ASSIST_STRENGTH = 1.5; // Higher = more snap
const FIN_DIMINISHING_EXPONENT = 0.94; // 1.0 = linear, <1.0 = diminishing | diminishes returns on fins
const ANGULAR_MASS_SCALE_EXPONENT = 0.5; // Rotation-specific scaling factor derived from mass. Mass slows down rotation.
const BRAKING_FORCE_MULTIPLIER = 0.1; // Lower = weaker braking, higher = more aggressive

// Engine speed cap and scaling
const SPEED_PER_THRUST_UNIT = 1; // Tunable: how much each unit of thrustPower contributes to max speed
const DIMINISHING_START = 8;
const DIMINISHING_RATE = 0.15;

export class MovementSystem {
  private readonly fallbackThrustPower = 10;
  private readonly baseThrust = 5;
  private externalImpulse = { x: 0, y: 0 };


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
    private readonly collisionSystem: BlockObjectCollisionSystem
  ) {}

  public setIntent(intent: MovementIntent): void {
    this.currentIntent = intent;
  }

  public applyExternalImpulse(dx: number, dy: number): void {
    this.externalImpulse.x += dx;
    this.externalImpulse.y += dy;
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

  let rawTurnPower = 1;

  for (const [coord, block] of this.ship.getAllBlocks()) {
    const behavior = block.type.behavior;

    if (behavior?.canThrust) {
      const power = behavior.thrustPower ?? this.baseThrust;
      const dir = classifyThrustDirection(block.rotation ?? 0);
      if (dir) {
        thrustGroups[dir].push({ coord, power, rotation: block.rotation ?? 0 });
      }
    }

    if (block.type.id.startsWith('fin')) {
      rawTurnPower += behavior?.turnPower ?? 0;
    }
  }

  // === Angular motion with assist ===
  const totalTurnPower = Math.pow(rawTurnPower, FIN_DIMINISHING_EXPONENT);
  const maxAngularSpeed = Math.min(totalTurnPower * angularScale * 0.3, 20);
  let targetAngularVelocity = 0;
  if (rotateLeft) targetAngularVelocity = -maxAngularSpeed;
  else if (rotateRight) targetAngularVelocity = maxAngularSpeed;

  const angularDelta = targetAngularVelocity - transform.angularVelocity;
  transform.angularVelocity += angularDelta * ROTATIONAL_ASSIST_STRENGTH * dt;
  transform.angularVelocity = Math.max(
    -maxAngularSpeed,
    Math.min(transform.angularVelocity, maxAngularSpeed)
  );

  // === Linear thrust
  if (thrustForward) {
    this.applyDirectionalThrust(dt, 'forward', thrustGroups.forward, transform, position);
  }
  if (strafeLeft) {
    this.applyDirectionalThrust(dt, 'strafeLeft', thrustGroups.strafeLeft, transform, position);
  }
  if (strafeRight) {
    this.applyDirectionalThrust(dt, 'strafeRight', thrustGroups.strafeRight, transform, position);
  }

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
  if (this.ship.getIsPlayerShip()) {
    this.collisionSystem.resolveCollisions(this.ship);

    // Optional: Clamp very small residuals to zero
    const v = transform.velocity;
    v.x = Math.round(v.x * 1000) / 1000;
    v.y = Math.round(v.y * 1000) / 1000;
  }

  // === Step 2: Integrate motion (velocity → position)
  transform.rotation += transform.angularVelocity * dt;
  position.x += velocity.x * dt;
  position.y += velocity.y * dt;

  // === Step 3: Update world-space block positions
  this.ship.updateBlockPositions();
}

  private applyDirectionalThrust(
    dt: number,
    thrustDirection: ThrustDirection,
    thrusters: { coord: GridCoord; power: number; rotation: number }[],
    transform: BlockEntityTransform,
    position: { x: number; y: number }
  ): void {
    let totalThrustX = 0;
    let totalThrustY = 0;

    // === Apply fallback to ALL directions equally ===
    const fallbackPower = this.fallbackThrustPower;
    const engineCount = thrusters.length + 1;
    const baseUnit = SPEED_PER_THRUST_UNIT;

    const totalEngineThrust = thrusters.reduce((sum, t) => sum + t.power, 0);
    const totalThrustPower = totalEngineThrust + fallbackPower;

    const maxSpeed = (() => {
      if (engineCount <= DIMINISHING_START) return totalThrustPower * baseUnit;

      const basePower = (totalThrustPower / engineCount) * DIMINISHING_START;
      const excessEngines = engineCount - DIMINISHING_START;
      const excessPowerPerEngine = totalThrustPower / engineCount;
      const effectivenessMultiplier = 1 / (1 + DIMINISHING_RATE * excessEngines);
      const diminishedExcessPower = excessPowerPerEngine * excessEngines * effectivenessMultiplier;
      return (basePower + diminishedExcessPower) * baseUnit;
    })();

    // === Apply fallback thrust in correct direction ===
    const fallbackDirection = (() => {
      switch (thrustDirection) {
        case 'forward': return this.rotateVector(0, -1, transform.rotation);
        case 'strafeLeft': return this.rotateVector(-1, 0, transform.rotation);
        case 'strafeRight': return this.rotateVector(1, 0, transform.rotation);
      }
    })();
    totalThrustX += fallbackDirection.x * fallbackPower;
    totalThrustY += fallbackDirection.y * fallbackPower;

    // === Apply thruster force
    for (const { coord, power, rotation: blockRotation } of thrusters) {
      const block = this.ship.getBlock(coord);
      if (!block) continue;

      const localThrust = this.getBlockThrustDirection(blockRotation);
      const worldThrust = this.rotateVector(localThrust.x, localThrust.y, transform.rotation);

      totalThrustX += worldThrust.x * power;
      totalThrustY += worldThrust.y * power;

      this.emitter.emit({
        coord,
        block,
        blockRotation,
        shipRotation: transform.rotation,
        shipPosition: position,
      });
    }

    // === Apply impulse
    const mass = this.ship.getTotalMass();
    const accelScale = Math.min(1, Math.pow(BASE_MASS / Math.max(mass, 1), 0.65));
    const impulseX = totalThrustX * dt * accelScale;
    const impulseY = totalThrustY * dt * accelScale;

    transform.velocity.x += impulseX;
    transform.velocity.y += impulseY;

    // === Directional assist
    const speed = Math.sqrt(transform.velocity.x ** 2 + transform.velocity.y ** 2);
    if (speed > 0) {
      const vxNorm = transform.velocity.x / speed;
      const vyNorm = transform.velocity.y / speed;

      const steerX = fallbackDirection.x - vxNorm;
      const steerY = fallbackDirection.y - vyNorm;

      transform.velocity.x += steerX * STEERING_ASSIST_STRENGTH * speed * dt;
      transform.velocity.y += steerY * STEERING_ASSIST_STRENGTH * speed * dt;
    }

    // === Soft speed cap (per-directional component limiting)
    const velocityInThrustDir =
      transform.velocity.x * fallbackDirection.x +
      transform.velocity.y * fallbackDirection.y;

    if (velocityInThrustDir > maxSpeed) {
      const excessRatio = velocityInThrustDir / maxSpeed;
      const softCapMultiplier = 1 / (1 + 0.5 * (excessRatio - 1));

      const excessVelocity =
        velocityInThrustDir - (velocityInThrustDir * softCapMultiplier);

      // Subtract excess along the thrust direction vector
      transform.velocity.x -= fallbackDirection.x * excessVelocity;
      transform.velocity.y -= fallbackDirection.y * excessVelocity;
    }
  }
}
