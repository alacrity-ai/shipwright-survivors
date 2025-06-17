// src/game/ship/factories/PreviewShipFactory.ts

import type { SerializedShip } from '@/systems/serialization/ShipSerializer';
import { PreviewShip } from '@/game/ship/PreviewShip';

/**
 * Creates a preview ship instance from serialized data with position and scale.
 * 
 * @param data - Serialized ship definition
 * @param x - X coordinate for preview positioning
 * @param y - Y coordinate for preview positioning
 * @param scale - Optional render scale multiplier (default: 1)
 * @returns A configured PreviewShip instance
 */
export function createPreviewShip(
  data: SerializedShip,
  x: number,
  y: number,
  scale: number = 1
): PreviewShip {
  const ship = new PreviewShip([], {
    position: { x, y },
    scale,
    rotation: 0,
    velocity: { x: 0, y: 0 },
    angularVelocity: 0,
  });

  ship.loadFromJson(data, false);
  return ship;
}