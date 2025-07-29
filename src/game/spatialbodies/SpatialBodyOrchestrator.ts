// src/game/spatialbodies/SpatialBodyOrchestrator.ts

import { SpatialBodyStore } from '@/game/spatialbodies/SpatialBodyStore';
import { SpatialBodyGrid } from './SpatialBodyGrid';
import { SpatialBodyRegistry } from './SpatialBodyRegistry';

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

  /**
   * Populate the store and grid using declarative spawn configs.
   */
  populateFromConfig(
    configs: SpatialBodySpawnConfig[],
    worldWidth: number,
    worldHeight: number
  ): void {
    for (const cfg of configs) {
      const def = SpatialBodyRegistry.getByName(cfg.type);

      for (let i = 0; i < cfg.count; i++) {
        const x = Math.random() * worldWidth - worldWidth / 2;
        const y = Math.random() * worldHeight - worldHeight / 2;

        const scale =
          def.baseScale *
          (1 + (Math.random() * 2 - 1) * cfg.scaleVariance);

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
