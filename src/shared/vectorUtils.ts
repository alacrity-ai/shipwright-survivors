// src/shared/types/vectorUtils.ts

import { getWorldWidth, getWorldHeight } from '@/config/world';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';

export type Vec2 = { x: number; y: number };

export function getDistance(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isWithinRange(a: Vec2, b: Vec2, range: number): boolean {
  return getDistance(a, b) <= range;
}

/**
 * Returns a random coordinate anywhere in the world, optionally constrained by a border margin.
 * @param borderMargin Distance from each edge to avoid (default = 0)
 */
export function getRandomWorldCoordinates(borderMargin: number = 0): Vec2 {
  const halfWidth = getWorldWidth() / 2;
  const halfHeight = getWorldHeight() / 2;

  const minX = -halfWidth + borderMargin;
  const maxX = halfWidth - borderMargin;

  const minY = -halfHeight + borderMargin;
  const maxY = halfHeight - borderMargin;

  const x = Math.random() * (maxX - minX) + minX;
  const y = Math.random() * (maxY - minY) + minY;

  return { x, y };
}

/**
 * Returns a coordinate randomly within a circular radius around a center point.
 */
export function getRandomCoordInRadius(center: GridCoord, radius: number): GridCoord {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius; // ensures uniform distribution
  const offsetX = Math.cos(angle) * r;
  const offsetY = Math.sin(angle) * r;

  return {
    x: center.x + offsetX,
    y: center.y + offsetY,
  };
}
