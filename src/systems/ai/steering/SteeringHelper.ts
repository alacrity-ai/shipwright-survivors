// src/systems/ai/steering/SteeringHelper.ts

import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { Vec2 } from '@/systems/ai/helpers/VectorUtils';
import type { Ship } from '@/game/ship/Ship';
import { angleDiff, subtract, normalize, vectorMagnitude, dot, predictPosition } from '@/systems/ai/helpers/VectorUtils';
import { getNetThrustDirection } from '@/systems/ai/helpers/ThrustUtils';
import { isThrustFacingTarget } from '@/systems/ai/helpers/ShipUtils';

/**
 * Rotates the ship to align its thrust direction toward the target.
 * Does not apply any thrust or braking — purely angular alignment.
 */
export function faceTarget(
  ship: Ship,
  targetPos: Vec2
): MovementIntent {
  const thrustDir = getNetThrustDirection(ship);
  const shipPos = ship.getTransform().position;

  const desiredDir = normalize(subtract(targetPos, shipPos));
  const desiredAngle = Math.atan2(desiredDir.y, desiredDir.x);
  const currentAngle = Math.atan2(thrustDir.y, thrustDir.x);
  const delta = angleDiff(currentAngle, desiredAngle);

  const tolerance = 0.05;
  const rotateLeft = delta < -tolerance;
  const rotateRight = delta > tolerance;

  return {
    thrustForward: false,
    brake: false,
    rotateLeft,
    rotateRight,
    strafeLeft: false,
    strafeRight: false,
  };
}

/**
 * Thrusts toward the target if thrust direction is properly aligned.
 * Brakes if close enough and still moving too fast toward the target.
 */
export function approachTarget(
  ship: Ship,
  targetPos: Vec2,
  currentVel: Vec2
): MovementIntent {
  const shipPos = ship.getTransform().position;
  const toTarget = subtract(targetPos, shipPos);
  const dist = vectorMagnitude(toTarget);
  const desiredDir = normalize(toTarget);

  const isAligned = isThrustFacingTarget(ship, targetPos, 0.15);
  const velocityTowardTarget = dot(currentVel, desiredDir);

  let thrustForward = false;
  let brake = false;

  if (dist < 100) {
    brake = velocityTowardTarget > 10;
  } else if (isAligned) {
    thrustForward = true;
  }

  // Angular steering logic (same as faceTarget)
  const thrustDir = getNetThrustDirection(ship);
  const desiredAngle = Math.atan2(desiredDir.y, desiredDir.x);
  const currentAngle = Math.atan2(thrustDir.y, thrustDir.x);
  const delta = angleDiff(currentAngle, desiredAngle);

  const rotateLeft = delta < -0.05;
  const rotateRight = delta > 0.05;

  return {
    thrustForward,
    brake,
    rotateLeft,
    rotateRight,
    strafeLeft: false,
    strafeRight: false,
  };
}

/**
 * Returns a MovementIntent that maintains an orbital trajectory around a target.
 * Uses thrust vector alignment and radial correction to sustain orbit.
 */
export function orbitTarget(
  ship: Ship,
  currentVel: Vec2,
  targetPos: Vec2,
  desiredRadius: number
): MovementIntent {
  const currentPos = ship.getTransform().position;
  const toTarget = subtract(targetPos, currentPos);
  const dist = vectorMagnitude(toTarget);
  const radiusError = dist - desiredRadius;

  const directionToTarget = normalize(toTarget);
  const orbitDirection = { x: -directionToTarget.y, y: directionToTarget.x };

  // === Phase 1: Determine rotation ===
  const netThrustDir = getNetThrustDirection(ship); // Approximate facing
  const desiredFacing = Math.atan2(orbitDirection.y, orbitDirection.x);
  const currentFacing = Math.atan2(netThrustDir.y, netThrustDir.x);
  const angleDelta = angleDiff(currentFacing, desiredFacing);

  const tolerance = 0.05;
  const rotateLeft = angleDelta < -tolerance;
  const rotateRight = angleDelta > tolerance;

  // === Phase 2: Decide thrust/brake ===
  let thrustForward = false;
  let brake = false;

  const velocityMag = vectorMagnitude(currentVel);
  const velocityAlignment = velocityMag > 0 ? dot(normalize(currentVel), orbitDirection) : 0;

  const innerEscapeThreshold = 40; // Minimum radius where we must push outward
  const misaligned = velocityAlignment < 0.5;

  if (radiusError > 20) {
    // === Too far: push along orbit direction to tighten orbit
    thrustForward = true;
  } else if (radiusError < -innerEscapeThreshold) {
    // === Too close: actively escape outward from center
    const outwardDir = normalize(subtract(currentPos, targetPos));
    const velOutward = velocityMag > 0 ? dot(normalize(currentVel), outwardDir) : 0;

    if (velOutward < 0.6) {
      // Moving inwards or stagnant — push outward
      thrustForward = true;
    } else {
      // Already drifting out — allow it to coast
      brake = false;
    }
  } else {
    // === Near optimal radius
    if (misaligned) {
      thrustForward = true;
    } else if (velocityAlignment > 0.7 && radiusError < 0) {
      brake = true;
    }
  }

  return {
    thrustForward,
    brake,
    rotateLeft,
    rotateRight,
    strafeLeft: false,
    strafeRight: false,
  };
}

export function leadTarget(
  shooterPos: Vec2,
  targetPos: Vec2,
  targetVel: Vec2,
  projectileSpeed: number
): Vec2 {
  const toTarget = subtract(targetPos, shooterPos);
  const a = dot(targetVel, targetVel) - projectileSpeed * projectileSpeed;
  const b = 2 * dot(toTarget, targetVel);
  const c = dot(toTarget, toTarget);

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0 || Math.abs(a) < 1e-5) {
    return targetPos; // fallback: aim at current position
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);
  const time = Math.max(t1, t2);

  return predictPosition(targetPos, targetVel, Math.max(time, 0));
}
