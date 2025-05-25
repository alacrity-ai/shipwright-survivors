// src/systems/physics/MovementSystem.ts

import type { Ship } from '@/game/ship/Ship';
import type { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';
import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';

export interface ShipTransform {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  rotation: number;
  angularVelocity: number;
}

const BASE_MASS = 100;
const INERTIAL_DAMPENING_FACTOR = 0.98; // 0.98 per second (~2% velocity loss/sec)
const STEERING_ASSIST_STRENGTH = 0.5;   // higher = more aggressive directional realignment

export class MovementSystem {
  private readonly fallbackThrustPower = 10;
  private readonly baseThrust = 5;
  private readonly thrustToSpeed = 1.5;

  private currentIntent: MovementIntent = {
    thrustForward: false,
    brake: false,
    rotateLeft: false,
    rotateRight: false,
  };

  constructor(
    private readonly ship: Ship,
    private readonly emitter: ThrusterEmitter
  ) {}

  public setIntent(intent: MovementIntent): void {
    this.currentIntent = intent;
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
    const facingX = Math.sin(blockFacingRad);
    const facingY = Math.cos(blockFacingRad);
    return { x: facingX, y: -facingY };
  }

public update(dt: number): void {
  const transform = this.ship.getTransform();
  const { position, velocity } = transform;

  const {
    rotateLeft,
    rotateRight,
    thrustForward,
    brake,
  } = this.currentIntent;

  // === Evaluate mass and acceleration scaling ===
  const mass = this.ship.getTotalMass();
  const scaleExponent = 0.65;
  const accelScale = Math.min(1, Math.pow(BASE_MASS / Math.max(mass, 1), scaleExponent));

  let totalThrustPower = this.fallbackThrustPower;
  let totalTurnPower = 1;
  const thrusters = [];

  for (const [coord, block] of this.ship.getAllBlocks()) {
    if (block.type.behavior?.canThrust) {
      const power = block.type.behavior.thrustPower ?? this.baseThrust;
      totalThrustPower += power;
      thrusters.push({ coord, power, rotation: block.rotation ?? 0 });
    }

    if (block.type.id.startsWith('fin')) {
      totalTurnPower += block.type.behavior?.turnPower ?? 0;
    }
  }

  // === Angular motion ===
  const angularAccel = totalTurnPower * 0.2 * accelScale;
  const maxAngularSpeed = Math.min(totalTurnPower * 0.3, 20);
  const angularFriction = 0.99;

  if (rotateLeft) {
    transform.angularVelocity -= angularAccel * dt;
  } else if (rotateRight) {
    transform.angularVelocity += angularAccel * dt;
  } else {
    transform.angularVelocity *= angularFriction;
  }

  transform.angularVelocity = Math.max(
    -maxAngularSpeed,
    Math.min(transform.angularVelocity, maxAngularSpeed)
  );

  // === Thrust and directional biasing ===
  if (thrustForward) {
    let totalThrustX = 0;
    let totalThrustY = 0;

    const forward = this.rotateVector(0, -1, transform.rotation);
    totalThrustX += forward.x * this.fallbackThrustPower;
    totalThrustY += forward.y * this.fallbackThrustPower;

    for (const { coord, power, rotation: blockRotation } of thrusters) {
      const localThrust = this.getBlockThrustDirection(blockRotation);
      const worldThrust = this.rotateVector(localThrust.x, localThrust.y, transform.rotation);

      totalThrustX += worldThrust.x * power;
      totalThrustY += worldThrust.y * power;

      this.emitter.emit({
        coord,
        blockRotation,
        shipRotation: transform.rotation,
        shipPosition: position
      });
    }

    const impulseX = totalThrustX * dt * accelScale;
    const impulseY = totalThrustY * dt * accelScale;

    velocity.x += impulseX;
    velocity.y += impulseY;

    // === Directional biasing (steering assist) ===
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    if (speed > 0) {
      const desiredDir = this.rotateVector(0, -1, transform.rotation);
      const vxNorm = velocity.x / speed;
      const vyNorm = velocity.y / speed;

      const steerX = desiredDir.x - vxNorm;
      const steerY = desiredDir.y - vyNorm;

      velocity.x += steerX * STEERING_ASSIST_STRENGTH * speed * dt;
      velocity.y += steerY * STEERING_ASSIST_STRENGTH * speed * dt;
    }

    // === Cap max speed ===
    const newSpeed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    const maxSpeed = totalThrustPower * this.thrustToSpeed;
    if (newSpeed > maxSpeed) {
      const scale = maxSpeed / newSpeed;
      velocity.x *= scale;
      velocity.y *= scale;
    }
  } else {
    // === Inertial dampening ===
    const dampen = Math.pow(INERTIAL_DAMPENING_FACTOR, dt);
    velocity.x *= dampen;
    velocity.y *= dampen;
  }

  // === Braking ===
  if (brake) {
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    if (speed > 0) {
      const vxNorm = velocity.x / speed;
      const vyNorm = velocity.y / speed;
      const brakingForce = totalThrustPower * dt * 1.2;

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

  // === Integrate motion ===
  transform.rotation += transform.angularVelocity * dt;
  position.x += velocity.x * dt;
  position.y += velocity.y * dt;

  this.ship.updateBlockPositions();
}

}

