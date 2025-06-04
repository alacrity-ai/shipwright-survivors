// src/game/entities/systems/CompositeBlockObjectCullingSystem.ts

import { BlockToObjectIndex } from '@/game/blocks/BlockToObjectIndexRegistry';
import type { Camera } from '@/core/Camera';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { Grid } from '@/systems/physics/Grid';

export class CompositeBlockObjectCullingSystem {
  constructor(
    private readonly grid: Grid,
    private readonly camera: Camera
  ) {}

  getVisibleObjects(): CompositeBlockObject[] {
    const bounds = this.camera.getViewportBounds();
    return this.queryObjectsInBounds(bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height);
  }

  getNearbyObjects(): CompositeBlockObject[] {
    const bounds = this.camera.getViewportBounds();
    const margin = 2000;
    return this.queryObjectsInBounds(
      bounds.x - margin,
      bounds.y - margin,
      bounds.x + bounds.width + margin,
      bounds.y + bounds.height + margin
    );
  }

  private queryObjectsInBounds(minX: number, minY: number, maxX: number, maxY: number): CompositeBlockObject[] {
    const blocks = this.grid.getBlocksInArea(minX, minY, maxX, maxY);

    const resultSet = new Set<CompositeBlockObject>();
    for (const block of blocks) {
      const obj = BlockToObjectIndex.getObject(block);
      if (obj) resultSet.add(obj);
    }

    return Array.from(resultSet);
  }
}

