// src/systems/ai/helpers/ShipUtils.ts

import { getDistance, subtract, normalize, dot } from './VectorUtils';
import type { Vec2 } from './VectorUtils';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import { getNetThrustDirection } from './ThrustUtils';
import { ShipGrid } from '@/game/ship/ShipGrid';
import { Faction } from '@/game/interfaces/types/Faction';

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
 * Returns the nearest ship within `range` that is not of the same faction,
 * is not neutral, and is not invulnerable. No LOS checks.
 */
export function findNearestTarget(originShip: Ship, range: number): Ship | null {
  const originFaction = originShip.getFaction();
  if (originFaction === Faction.Neutral) return null;

  const originPos = originShip.getTransform().position;
  const candidates = ShipGrid.getInstance().getShipsInRadius(originPos.x, originPos.y, range);

  let nearest: Ship | null = null;
  let nearestDist = Infinity;

  for (const candidate of candidates) {
    if (candidate === originShip) continue;

    const faction = candidate.getFaction();

    if (faction === originFaction || faction === Faction.Neutral) continue;
    if (candidate.getAffixes()?.invulnerable) continue;

    const candidatePos = candidate.getTransform().position;
    const dist = getDistance(originPos, candidatePos);

    if (dist <= range && dist < nearestDist) {
      nearest = candidate;
      nearestDist = dist;
    }
  }

  return nearest;
}

/**
 * Returns the farthest ship within `range` that is not of the same faction,
 * is not neutral, and is not invulnerable. No LOS checks.
 */
export function findFarthestTarget(originShip: Ship, range: number): Ship | null {
  const originFaction = originShip.getFaction();
  if (originFaction === Faction.Neutral) return null;

  const originPos = originShip.getTransform().position;
  const candidates = ShipGrid.getInstance().getShipsInRadius(originPos.x, originPos.y, range);

  let farthest: Ship | null = null;
  let farthestDist = -Infinity;

  for (const candidate of candidates) {
    if (candidate === originShip) continue;

    const faction = candidate.getFaction();
    if (faction === originFaction || faction === Faction.Neutral) continue;
    if (candidate.getAffixes()?.invulnerable) continue;

    const candidatePos = candidate.getTransform().position;
    const dist = getDistance(originPos, candidatePos);

    if (dist <= range && dist > farthestDist) {
      farthest = candidate;
      farthestDist = dist;
    }
  }

  return farthest;
}

/**
 * Selects a random *hostile* ship inside the specified radius.
 *
 * @param originShip      Ship whose perspective determines “enemy”
 * @param range           Search radius (world-space units)
 * @param excludeShip     Optional ship to omit from selection (e.g. the last target in a chain)
 * @param targetFaction   If supplied, **only** ships of this faction are eligible
 *
 * @returns A random enemy ship satisfying all criteria, otherwise `null`.
 *
 * Design invariants
 * -----------------
 * • Neutral or invulnerable ships are never returned.  
 * • Line-of-sight is *not* evaluated; the caller may add that filter if required.  
 * • The function is deterministic only up to the PRNG used by `Math.random()`.
 */
export function findRandomTargetInRange(
  originShip    : Ship,
  range         : number,
  excludeShip?  : Ship,
  targetFaction?: Faction,
): Ship | null {
  const originFaction = originShip.getFaction();

  // Early-out: neutrals have no hostilities
  if (originFaction === Faction.Neutral) return null;

  const { x: ox, y: oy } = originShip.getTransform().position;

  // Spatial query – coarse filter
  const candidates = ShipGrid.getInstance().getShipsInRadius(ox, oy, range);

  const eligible: Ship[] = [];

  for (const ship of candidates) {
    if (ship === originShip)     continue;              // self
    if (ship === excludeShip)    continue;              // user-explicit exclusion

    const faction = ship.getFaction();

    // Faction gating: either explicitly requested or “any enemy”
    if (targetFaction !== undefined) {
      if (faction !== targetFaction) continue;
    } else {
      if (faction === originFaction || faction === Faction.Neutral) continue;
    }

    // Gameplay immunity check
    if (ship.getAffixes()?.invulnerable) continue;

    // Precise distance check (ShipGrid is coarse)
    const { x, y } = ship.getTransform().position;
    if (getDistance({ x: ox, y: oy }, { x, y }) > range) continue;

    eligible.push(ship);
  }

  if (eligible.length === 0) return null;

  // Uniform random selection
  return eligible[(Math.random() * eligible.length) | 0];
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
