import type { Ship } from '@/game/ship/Ship';
import type { Vec2 } from './VectorUtils';
import { normalize } from './VectorUtils';

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
 * This is the direction the ship will accelerate when thrust is applied.
 */
export function getNetThrustDirection(ship: Ship): Vec2 {
  let sumX = 0;
  let sumY = 0;

  const shipRotation = ship.getTransform().rotation;
  for (const block of ship.getEngineBlocks()) {
    const power = block.type.behavior!.thrustPower ?? 5;
    const local = getBlockThrustDirection(block.rotation ?? 0);
    const world = rotateVector(local, shipRotation);

    sumX += world.x * power;
    sumY += world.y * power;
  }

  return normalize({ x: sumX, y: sumY });
}
