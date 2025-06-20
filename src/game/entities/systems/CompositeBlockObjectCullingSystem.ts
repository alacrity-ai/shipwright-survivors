// src/game/entities/systems/CompositeBlockObjectCullingSystem.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { CompositeBlockObjectGrid } from '@/game/entities/CompositeBlockObjectGrid';

export class CompositeBlockObjectCullingSystem {
  constructor(
    private readonly objectGrid: CompositeBlockObjectGrid<CompositeBlockObject>,
  ) {}

  getVisibleObjects(): CompositeBlockObject[] {
    return this.objectGrid.getObjectsInCameraView();
  }

  getNearbyObjects(): CompositeBlockObject[] {
    return this.objectGrid.getObjectsInCameraView(2000);
  }
}
