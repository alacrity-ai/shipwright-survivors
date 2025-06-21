import type { Camera } from '@/core/Camera';
import { BLOCK_SIZE } from '@/config/view';
import type { Ship } from '@/game/ship/Ship';

/**
 * Converts mouse screen position to the nearest ship-local grid coordinate.
 */
/** Utility: mouse → grid */
export function getHoveredGridCoord(
  mouse: { x: number; y: number },
  camera: Camera,
  shipPos: { x: number; y: number },
  shipRotation: number
): { x: number; y: number } {
  const mouseWorld = camera.screenToWorld(mouse.x, mouse.y);

  const dx = mouseWorld.x - shipPos.x;
  const dy = mouseWorld.y - shipPos.y;

  const cos = Math.cos(-shipRotation);
  const sin = Math.sin(-shipRotation);

  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  return {
    x: Math.round(localX / BLOCK_SIZE),
    y: Math.round(localY / BLOCK_SIZE)
  };
}

export function isCoordConnectedToShip(ship: Ship, coord: { x: number; y: number }): boolean {
  const neighbors = [
    { x: coord.x + 1, y: coord.y },
    { x: coord.x - 1, y: coord.y },
    { x: coord.x,     y: coord.y + 1 },
    { x: coord.x,     y: coord.y - 1 }
  ];

  return neighbors.some(n => ship.hasBlockAt(n));
}
