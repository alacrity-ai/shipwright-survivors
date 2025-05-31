// src/shared/maskUtils.ts

export interface Offset {
  dx: number;
  dy: number;
}

/**
 * Generates a circular pixel mask for a given radius, returning pixel offsets relative to center.
 * Points satisfy dx² + dy² ≤ r² (integer discrete disk).
 */
export function generateCircleMask(radius: number): Offset[] {
  const points: Offset[] = [];
  const rSquared = radius * radius;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= rSquared) {
        points.push({ dx, dy });
      }
    }
  }

  return points;
}
