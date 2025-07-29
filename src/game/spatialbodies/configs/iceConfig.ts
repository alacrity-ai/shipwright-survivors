// src/game/spatialbodies/configs/iceConfig.ts

import type { SpatialBodySpawnConfig } from '@/game/spatialbodies/interfaces/SpatialBodySpawnConfig';

/**
 * Default distribution for icy spatial bodies.
 * Designed to create a visually varied asteroid field:
 * - A few massive chunks (ice-04, ice-03)
 * - More medium-sized pieces (ice-00, ice-01)
 * - Numerous smaller pieces (ice-02) for density
 */
export const iceSpatialBodyConfig: SpatialBodySpawnConfig[] = [
  {
    type: 'ice-04',        // Largest chunk (1024x1024 UV region)
    count: 12,              // Sparse anchors
    scaleVariance: 0.15,   // ±15% size jitter
  },
  {
    type: 'ice-03',        // Large chunk (532x532 UV region)
    count: 16,              // Fewer large bodies
    scaleVariance: 0.2,    // ±20% jitter
  },
  {
    type: 'ice-00',        // Medium chunk (339x339 UV region)
    count: 12,             // Moderate presence
    scaleVariance: 0.25,   // ±25% jitter
  },
  {
    type: 'ice-01',        // Medium/small chunk (398x398 UV region)
    count: 16,             // More frequent filler
    scaleVariance: 0.3,    // ±30% jitter
  },
  {
    type: 'ice-02',        // Smallest chunk (283x283 UV region)
    count: 24,             // Numerous filler pieces
    scaleVariance: 0.35,   // ±35% jitter
  },
];
