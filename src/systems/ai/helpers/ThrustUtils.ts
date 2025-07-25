import type { Ship } from '@/game/ship/Ship';
import type { Vec2 } from './VectorUtils';
import { normalize } from './VectorUtils';

import { BlockManager } from '@/game/blocks/system/BlockManager';

/**
 * Converts a block's thrust angle (degrees) into a local unit vector.
 * Engines push opposite the direction they face.
 */
export function getBlockThrustDirection(blockRotationDeg: number): Vec2 {
  const blockFacingRad = blockRotationDeg * (Math.PI / 180);
  const facingX = Math.sin(blockFacingRad);
  const facingY = Math.cos(blockFacingRad);
  return { x: facingX, y: -facingY };
}

/**
 * Rotates a 2D vector (x, y) by an angle in radians.
 */
export function rotateVector(vec: Vec2, angleRad: number): Vec2 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: vec.x * cos - vec.y * sin,
    y: vec.x * sin + vec.y * cos
  };
}

/**
 * Computes the normalized net thrust vector of a ship in world space.
 * Uses only SOA data (no BlockType lookups) for maximum performance.
 */
export function getNetThrustDirection(ship: Ship): Vec2 {
  let sumX = 0;
  let sumY = 0;

  const store = BlockManager.getInstance().getBlockStore();
  const shipRotation = ship.getTransform().rotation;

  for (const idx of ship.getEngineIndices()) {
    if (store.canThrust[idx] === 0) continue;

    const power = store.thrustPower[idx];
    if (power <= 0) continue;

    // Compute the thrust direction relative to the block’s local rotation
    const local = getBlockThrustDirection(store.rotation[idx] ?? 0);
    const world = rotateVector(local, shipRotation);

    sumX += world.x * power;
    sumY += world.y * power;
  }

  return normalize({ x: sumX, y: sumY });
}
