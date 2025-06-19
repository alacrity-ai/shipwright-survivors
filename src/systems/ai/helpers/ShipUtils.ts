// src/systems/ai/helpers/ShipUtils.ts

import { getDistance, subtract, normalize, dot } from './VectorUtils';
import type { Vec2 } from './VectorUtils';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import { getNetThrustDirection } from './ThrustUtils';
import { ShipRegistry } from '@/game/ship/ShipRegistry';


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


/**
 * Returns the nearest ship within `range` that is not of the same faction.
 * Does not perform LOS checks.
 */
export function findNearestTarget(originShip: Ship, range: number): Ship | null {
  const originFaction = originShip.getFaction();
  const originPos = originShip.getTransform().position;

  let nearest: Ship | null = null;
  let nearestDist = Infinity;
  
  // TODO : Replace this with getAllNotInFaction, will be faster if ship keeps maps of ships by faction
  // const allShips = ShipRegistry.getInstance().getAll(); // Assumes this returns all active ships
  const playerShip = ShipRegistry.getInstance().getPlayerShip();
  if (!playerShip) return null;

  for (const candidate of [playerShip]) {
    if (candidate === originShip) continue;
    if (candidate.getFaction() === originFaction) continue;

    const candidatePos = candidate.getTransform().position;
    const dist = getDistance(originPos, candidatePos);

    if (dist <= range && dist < nearestDist) {
      nearest = candidate;
      nearestDist = dist;
    }
  }

  return nearest;
}

export function getWorldPositionFromShipOffset(
  transform: BlockEntityTransform,
  offset: { x: number; y: number }
): { x: number; y: number } {
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  return {
    x: transform.position.x + offset.x * cos - offset.y * sin,
    y: transform.position.y + offset.x * sin + offset.y * cos,
  };
}
