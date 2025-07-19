// src/systems/ai/steering/SteeringHelper.ts

import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { Vec2 } from '@/systems/ai/helpers/VectorUtils';
import type { Ship } from '@/game/ship/Ship';
import type { IntentSOA } from '@/core/intent/interfaces/ShipIntent';

import { angleDiff, subtract, normalize, vectorMagnitude, dot, predictPosition } from '@/systems/ai/helpers/VectorUtils';
import { getNetThrustDirection } from '@/systems/ai/helpers/ThrustUtils';
import { isThrustFacingTarget } from '@/systems/ai/helpers/ShipUtils';

/**
 * Writes rotation-only steering intent into SOA buffers.
 * Aligns ship's thrust direction toward the target.
 * Does not trigger thrust or braking.
 */
export function faceTargetSOA(
  ship: Ship,
  targetPos: Vec2,
  soa: IntentSOA,
  idx: number
): void {
  const thrustDir = getNetThrustDirection(ship);
  const shipPos = ship.getTransform().position;

  const desiredDir = normalize(subtract(targetPos, shipPos));
  const desiredAngle = Math.atan2(desiredDir.y, desiredDir.x);
  const currentAngle = Math.atan2(thrustDir.y, thrustDir.x);
  const delta = angleDiff(currentAngle, desiredAngle);

  const tolerance = 0.05;

  soa.thrustForward[idx] = 0;
  soa.brake[idx] = 0;
  soa.strafeLeft[idx] = 0;
  soa.strafeRight[idx] = 0;
  soa.rotateLeft[idx] = delta < -tolerance ? 1 : 0;
  soa.rotateRight[idx] = delta > tolerance ? 1 : 0;
}

/**
 * Writes movement and rotation steering intent into SOA buffers.
 * Moves the ship toward the target when aligned; brakes when too close or moving too fast.
 */
export function approachTargetSOA(
  ship: Ship,
  targetPos: Vec2,
  currentVel: Vec2,
  soa: IntentSOA,
  idx: number
): void {
  const shipPos = ship.getTransform().position;
  const toTarget = subtract(targetPos, shipPos);
  const dist = vectorMagnitude(toTarget);
  const desiredDir = normalize(toTarget);

  const isAligned = isThrustFacingTarget(ship, targetPos, 0.15);
  const velocityTowardTarget = dot(currentVel, desiredDir);

  let thrustForward = 0;
  let brake = 0;

  if (dist < 100) {
    brake = velocityTowardTarget > 10 ? 1 : 0;
  } else if (isAligned) {
    thrustForward = 1;
  }

  // Angular steering (like faceTarget)
  const thrustDir = getNetThrustDirection(ship);
  const desiredAngle = Math.atan2(desiredDir.y, desiredDir.x);
  const currentAngle = Math.atan2(thrustDir.y, thrustDir.x);
  const delta = angleDiff(currentAngle, desiredAngle);

  const rotateLeft = delta < -0.05 ? 1 : 0;
  const rotateRight = delta > 0.05 ? 1 : 0;

  // Write directly to SOA buffers
  soa.thrustForward[idx] = thrustForward;
  soa.brake[idx] = brake;
  soa.rotateLeft[idx] = rotateLeft;
  soa.rotateRight[idx] = rotateRight;
  soa.strafeLeft[idx] = 0;
  soa.strafeRight[idx] = 0;
}

/**
 * Writes orbital movement and rotation intent into SOA buffers.
 * Sustains a circular orbit around the target, correcting radius and direction.
 *
 * @param clockwise If true, orbits clockwise, else counterclockwise.
 */
export function orbitTargetSOA(
  ship: Ship,
  currentVel: Vec2,
  targetPos: Vec2,
  desiredRadius: number,
  clockwise: boolean,
  soa: IntentSOA,
  idx: number
): void {
  const currentPos = ship.getTransform().position;
  const toTarget = subtract(targetPos, currentPos);
  const dist = vectorMagnitude(toTarget);
  const radiusError = dist - desiredRadius;

  const directionToTarget = normalize(toTarget);

  // Orbit direction: rotate unit vector by ±90°
  const orbitDirection = clockwise
    ? { x: directionToTarget.y, y: -directionToTarget.x }
    : { x: -directionToTarget.y, y: directionToTarget.x };

  // === Phase 1: Rotation control ===
  const netThrustDir = getNetThrustDirection(ship);
  const desiredFacing = Math.atan2(orbitDirection.y, orbitDirection.x);
  const currentFacing = Math.atan2(netThrustDir.y, netThrustDir.x);
  const angleDelta = angleDiff(currentFacing, desiredFacing);

  const tolerance = 0.05;
  const rotateLeft = angleDelta < -tolerance ? 1 : 0;
  const rotateRight = angleDelta > tolerance ? 1 : 0;

  // === Phase 2: Thrust/Brake logic ===
  let thrustForward = 0;
  let brake = 0;

  const velocityMag = vectorMagnitude(currentVel);
  const velocityAlignment = velocityMag > 0 ? dot(normalize(currentVel), orbitDirection) : 0;

  const innerEscapeThreshold = 40;
  const misaligned = velocityAlignment < 0.5;

  if (radiusError > 20) {
    thrustForward = 1;
  } else if (radiusError < -innerEscapeThreshold) {
    const outwardDir = normalize(subtract(currentPos, targetPos));
    const velOutward = velocityMag > 0 ? dot(normalize(currentVel), outwardDir) : 0;

    if (velOutward < 0.6) {
      thrustForward = 1;
    } else {
      brake = 0;
    }
  } else {
    if (misaligned) {
      thrustForward = 1;
    } else if (velocityAlignment > 0.7 && radiusError < 0) {
      brake = 1;
    }
  }

  // Write to SOA
  soa.thrustForward[idx] = thrustForward;
  soa.brake[idx] = brake;
  soa.rotateLeft[idx] = rotateLeft;
  soa.rotateRight[idx] = rotateRight;
  soa.strafeLeft[idx] = 0;
  soa.strafeRight[idx] = 0;
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
