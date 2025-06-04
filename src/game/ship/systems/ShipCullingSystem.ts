// src/game/ship/systems/ShipCullingSystem.ts

import { BlockToObjectIndex } from '@/game/blocks/BlockToObjectIndexRegistry';
import type { Grid } from '@/systems/physics/Grid';
import type { Camera } from '@/core/Camera';
import { Ship } from '@/game/ship/Ship';

export class ShipCullingSystem {
  constructor(
    private readonly grid: Grid,
    private readonly camera: Camera
  ) {}

  getVisibleShips(): Ship[] {
    return this.queryShipsInBounds(250);
  }

  getActiveAIShips(): Ship[] {
    return this.queryShipsInBounds(2000);
  }

  private queryShipsInBounds(margin: number): Ship[] {
    const bounds = this.camera.getViewportBounds();
    const minX = bounds.x - margin;
    const minY = bounds.y - margin;
    const maxX = bounds.x + bounds.width + margin;
    const maxY = bounds.y + bounds.height + margin;

    const nearbyBlocks = this.grid.getBlocksInArea(minX, minY, maxX, maxY);
    const resultSet = new Set<Ship>();

    for (const block of nearbyBlocks) {
      const obj = BlockToObjectIndex.getObject(block);
      if (obj && obj instanceof Ship) {
        resultSet.add(obj);
      }
    }

    return Array.from(resultSet);
  }
}
