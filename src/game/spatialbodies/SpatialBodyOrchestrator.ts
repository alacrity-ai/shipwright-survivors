// src/game/spatialbodies/SpatialBodyOrchestrator.ts

import { SpatialBodyStore } from '@/game/spatialbodies/SpatialBodyStore';
import { SpatialBodyGrid } from './SpatialBodyGrid';
import { SpatialBodyRegistry } from './SpatialBodyRegistry';

import type { PlanetSpawnConfig } from '@/game/missions/types/MissionDefinition';
import type { SpatialBodySpawnConfig } from '@/game/spatialbodies/interfaces/SpatialBodySpawnConfig';

/**
 * Handles population of SpatialBodyStore based on mission configs.
 * Each spawned body is pre-initialized with:
 * - World position (randomized within map bounds)
 * - Scale (base scale with jitter)
 * - Rotation
 * - Atlas index + UV rectangle (from SpatialBodyDefinition)
 */
export class SpatialBodyOrchestrator {
  constructor(
    private readonly store: SpatialBodyStore,
    private readonly grid: SpatialBodyGrid
  ) {}

  populateFromConfig(
    configs: SpatialBodySpawnConfig[],
    worldWidth: number,
    worldHeight: number,
    planets: PlanetSpawnConfig[] = []
  ): void {
    const EXCLUSION_PLANET_RADIUS = 2500;  // half-size zone
    const MIN_BODY_SEPARATION = 500;       // no two bodies closer than this
    const MAX_ATTEMPTS = 20;               // allow more retries due to extra constraint

    const placedPositions: { x: number; y: number }[] = [];

    for (const cfg of configs) {
      const def = SpatialBodyRegistry.getByName(cfg.type);

      for (let i = 0; i < cfg.count; i++) {
        let x = 0;
        let y = 0;
        let valid = false;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          x = Math.random() * worldWidth - worldWidth / 2;
          y = Math.random() * worldHeight - worldHeight / 2;

          let tooClose = false;

          // --- Check planet exclusion zone ---
          for (const planet of planets) {
            const dx = x - planet.x;
            const dy = y - planet.y;
            if (Math.abs(dx) < EXCLUSION_PLANET_RADIUS && Math.abs(dy) < EXCLUSION_PLANET_RADIUS) {
              tooClose = true;
              break;
            }
          }

          // --- Check other spatial bodies for overlap ---
          if (!tooClose) {
            for (const pos of placedPositions) {
              const dx = x - pos.x;
              const dy = y - pos.y;
              const distSq = dx * dx + dy * dy;
              if (distSq < MIN_BODY_SEPARATION * MIN_BODY_SEPARATION) {
                tooClose = true;
                break;
              }
            }
          }

          if (!tooClose) {
            valid = true;
            break;
          }
        }

        // Proceed even if we failed to find a "perfect" spot (after MAX_ATTEMPTS)
        placedPositions.push({ x, y });

        const scale =
          def.baseScale * (1 + (Math.random() * 2 - 1) * cfg.scaleVariance);
        const rotation = Math.random() * Math.PI * 2;

        const index = this.store.allocateInstance(
          def.atlasIndex,
          def.uMin,
          def.vMin,
          def.uMax,
          def.vMax,
          x,
          y,
          scale,
          rotation
        );

        if (index >= 0) {
          this.grid.register(index, x, y);
        }
      }
    }
  }

  /**
   * Removes all spatial bodies from the store and grid.
   */
  clearAll(): void {
    this.store.clear();
    this.grid.clear();
  }
}
