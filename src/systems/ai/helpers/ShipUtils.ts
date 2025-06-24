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

  console.log('[ShipUtils] findNearestTarget: candidates count: %d', candidates.length);

  let nearest: Ship | null = null;
  let nearestDist = Infinity;

  for (const candidate of candidates) {
    if (candidate === originShip) continue;

    const faction = candidate.getFaction();
    if (faction === Faction.Player) {
      console.log('[ShipUtils] findNearestTarget: candidate is player');
    }
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
 * Returns a random enemy ship within `range` of `originShip`,
 * excluding same-faction, neutral, and invulnerable ships.
 * No LOS checks.
 */
export function findRandomTargetInRange(originShip: Ship, range: number): Ship | null {
  const originFaction = originShip.getFaction();
  if (originFaction === Faction.Neutral) return null;

  const originPos = originShip.getTransform().position;
  const candidates = ShipGrid.getInstance().getShipsInRadius(originPos.x, originPos.y, range);

  const validTargets: Ship[] = [];

  for (const candidate of candidates) {
    if (candidate === originShip) continue;

    const faction = candidate.getFaction();
    if (faction === originFaction || faction === Faction.Neutral) continue;
    if (candidate.getAffixes()?.invulnerable) continue;

    const candidatePos = candidate.getTransform().position;
    const dist = getDistance(originPos, candidatePos);

    if (dist <= range) {
      validTargets.push(candidate);
    }
  }

  if (validTargets.length === 0) return null;

  const index = Math.floor(Math.random() * validTargets.length);
  return validTargets[index];
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
