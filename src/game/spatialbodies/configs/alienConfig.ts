// src/game/spatialbodies/configs/alienConfig.ts

import type { SpatialBodySpawnConfig } from '@/game/spatialbodies/interfaces/SpatialBodySpawnConfig';

/**
 * Default distribution for alien/bio-organic spatial bodies.
 * Intent: unsettling variety — a few massive bio-masses, several large growths,
 * and many smaller fragments to create the impression of an invasive, spreading organism.
 *
 * UV reference (px, from atlas):
 * - alien-01: 689x917 (largest biomass)
 * - alien-02: 339x573 (large growth)
 * - alien-03: 207x369 (medium segment)
 * - alien-05: 232x341 (medium segment, irregular)
 * - alien-04: 221x321 (medium-small segment)
 * - alien-06: 180x208 (small fragment)
 */
export const alienSpatialBodyConfig: SpatialBodySpawnConfig[] = [
  {
    type: 'alien-01',     // Largest biomass
    count: 88,            // Sparse, dominating presence
    scaleVariance: 0.15,  // ±15% jitter
  },
  {
    type: 'alien-02',     // Large growth
    count: 100,           // Fewer than medium segments
    scaleVariance: 0.2,   // ±20% jitter
  },
  {
    type: 'alien-03',     // Medium segment
    count: 108,           // Common
    scaleVariance: 0.25,  // ±25% jitter
  },
  {
    type: 'alien-05',     // Medium irregular segment
    count: 108,           // Common, same tier as alien-03
    scaleVariance: 0.25,  // ±25% jitter
  },
  {
    type: 'alien-04',     // Medium-small segment
    count: 116,           // Slightly more frequent
    scaleVariance: 0.3,   // ±30% jitter
  },
  {
    type: 'alien-06',     // Smallest fragment
    count: 128,           // Most numerous for field density
    scaleVariance: 0.35,  // ±35% jitter
  },
];
