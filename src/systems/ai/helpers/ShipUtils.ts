// src/systems/ai/helpers/ShipUtils.ts

import { getDistance, subtract, normalize, dot } from './VectorUtils';
import type { Vec2 } from './VectorUtils';
import type { Ship } from '@/game/ship/Ship';
import { getNetThrustDirection } from './ThrustUtils';

export function isWithinRange(a: Vec2, b: Vec2, range: number): boolean {
  return getDistance(a, b) <= range;
}

export function getThrustAlignmentDelta(ship: Ship, targetPos: Vec2): number {
  const pos = ship.getTransform().position;
  const thrustDir = getNetThrustDirection(ship);
  const toTarget = subtract(targetPos, pos);
  const desiredDir = normalize(toTarget);

  const dotProduct = dot(thrustDir, desiredDir); // cosine of angle
  return Math.acos(Math.max(-1, Math.min(1, dotProduct))); // Clamp to avoid floating point errors
}

export function isThrustFacingTarget(ship: Ship, targetPos: Vec2, thresholdRad = 0.15): boolean {
  return getThrustAlignmentDelta(ship, targetPos) <= thresholdRad;
}


