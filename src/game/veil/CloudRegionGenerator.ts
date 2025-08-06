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
 * Generates a valid list of non-overlapping CloudRegion objects.
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

  const [minRadius, maxRadius] = radiusRange;
  const [minRegions, maxRegions] = regionCountRange;

  const halfWidth = worldWidth / 2;
  const halfHeight = worldHeight / 2;

  const regionCount = Math.floor(randomInRange(minRegions, maxRegions + 1));
  const regions: CloudRegion[] = [];

  let attempts = 0;
  const MAX_ATTEMPTS = 1000;

  while (regions.length < regionCount && attempts < MAX_ATTEMPTS) {
    attempts++;

    const radius = randomInRange(minRadius, maxRadius);

    const x = randomInRange(-halfWidth + radius, halfWidth - radius);
    const y = randomInRange(-halfHeight + radius, halfHeight - radius);
    const center = { x, y };

    // Reject if too close to world center
    const distFromCenter = distance(center, { x: 0, y: 0 });
    if (distFromCenter < minDistanceFromCenter) continue;

    // Reject if too close to other regions
    let tooClose = false;
    for (const region of regions) {
      const edgeToEdgeDistance = distance(center, region.center) - radius - region.radius;
      if (edgeToEdgeDistance < minRegionSpacing) {
        tooClose = true;
        break;
      }
    }

    if (tooClose) continue;

    // Accept the region
    const region: CloudRegion = {
      id: `generated-${regions.length}`,
      center,
      radius,
      frontParams,
      backParams,
      mutationOptions,
      bossOptions,
    };

    regions.push(region);
  }

  return regions;
}
