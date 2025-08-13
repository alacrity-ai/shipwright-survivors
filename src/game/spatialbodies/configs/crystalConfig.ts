// src/game/spatialbodies/configs/crystalConfig.ts

import type { SpatialBodySpawnConfig } from '@/game/spatialbodies/interfaces/SpatialBodySpawnConfig';

/**
 * Default distribution for crystalline spatial bodies.
 * Intent: a few monumental shards, several substantial prisms, and many
 * small facets to create glittering density.
 *
 * UV reference (px, from atlas):
 * - crystal-01: 648x937 (monolithic shard)
 * - crystal-02: 346x645 (tall prism)
 * - crystal-03: 184x384 (medium shard)
 * - crystal-04: 166x323 (small shard)
 * - crystal-05: 136x197 (facet filler)
 */
export const crystalSpatialBodyConfig: SpatialBodySpawnConfig[] = [
  {
    type: 'crystal-01',    // Largest monolithic shard (648x937)
    count: 16,             // Sparse anchors
    scaleVariance: 0.15,   // ±15% jitter to preserve silhouette
  },
  {
    type: 'crystal-02',    // Large/tall prism (346x645)
    count: 18,            // Less common than medium shards
    scaleVariance: 0.2,    // ±20% jitter
  },
  {
    type: 'crystal-03',    // Medium shard (184x384)
    count: 16,            // Core population
    scaleVariance: 0.25,   // ±25% jitter
  },
  {
    type: 'crystal-04',    // Small shard (166x323)
    count: 12,            // More frequent
    scaleVariance: 0.3,    // ±30% jitter
  },
  {
    type: 'crystal-05',    // Facet filler (136x197)
    count: 12,            // Most numerous for sparkle/density
    scaleVariance: 0.35,   // ±35% jitter
  },
];
