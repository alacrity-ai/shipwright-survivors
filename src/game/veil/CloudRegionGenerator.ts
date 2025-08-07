// src/game/veil/CloudRegionGenerator.ts

import type { Vec2 } from '@/game/veil/interfaces/CloudRegion';
import type { CloudRegion } from '@/game/veil/interfaces/CloudRegion';
import type { CloudRegionGenerationOptions } from '@/game/veil/interfaces/CloudRegionGenerationOptions';

function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Generates a valid list of non-overlapping `CloudRegion` objects,
 * each representing a procedurally placed Veil zone within the world bounds.
 * 
 * Ensures:
 * - Regions are not too close to the world center (to preserve spawn/navigation space)
 * - Regions are spaced far enough from each other (to avoid visual overlap)
 * - Each region receives its own deep-cloned `mutationOptions` and `bossOptions` to prevent runtime leakage across missions
 *
 * @param options Cloud region generation constraints and prefab parameters
 * @returns An array of spatially distributed `CloudRegion` definitions
 */
export function generateCloudRegions(options: CloudRegionGenerationOptions): CloudRegion[] {
  const {
    worldWidth,
    worldHeight,
    minDistanceFromCenter,
    minRegionSpacing,
    radiusRange,
    regionCountRange,
    frontParams,
    backParams,
    mutationOptions,
    bossOptions,
  } = options;

  // Extract min/max bounds for radius and region count
  const [minRadius, maxRadius] = radiusRange;
  const [minRegions, maxRegions] = regionCountRange;

  // Half extents for clamping spatial distribution within world bounds
  const halfWidth = worldWidth / 2;
  const halfHeight = worldHeight / 2;

  // Determine how many regions to generate (inclusive random integer in range)
  const regionCount = Math.floor(randomInRange(minRegions, maxRegions + 1));
  const regions: CloudRegion[] = [];

  let attempts = 0;
  const MAX_ATTEMPTS = 1000;

  while (regions.length < regionCount && attempts < MAX_ATTEMPTS) {
    attempts++;

    // Randomize radius per region to introduce variability
    const radius = randomInRange(minRadius, maxRadius);

    // Compute candidate center location, ensuring region fits within world bounds
    const x = randomInRange(-halfWidth + radius, halfWidth - radius);
    const y = randomInRange(-halfHeight + radius, halfHeight - radius);
    const center = { x, y };

    // Reject region if too close to world origin (typically reserved for player spawn/neutral space)
    const distFromCenter = distance(center, { x: 0, y: 0 });
    if (distFromCenter < minDistanceFromCenter) continue;

    // Reject if overlapping any existing region (based on edge-to-edge spacing)
    let tooClose = false;
    for (const region of regions) {
      const edgeToEdgeDistance = distance(center, region.center) - radius - region.radius;
      if (edgeToEdgeDistance < minRegionSpacing) {
        tooClose = true;
        break;
      }
    }

    if (tooClose) continue;

    // === Accept region ===
    regions.push({
      id: `generated-${regions.length}`,
      center,
      radius,
      frontParams,
      backParams,

      // 💡 Clone mutable objects to avoid runtime state leakage across missions
      mutationOptions: structuredClone(mutationOptions),
      bossOptions: structuredClone(bossOptions),
    });
  }

  return regions;
}
