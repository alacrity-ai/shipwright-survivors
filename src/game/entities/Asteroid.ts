// src/game/entities/Asteroid.ts

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';

import { CompositeBlockObject } from './CompositeBlockObject';
import { Grid } from '@/systems/physics/Grid';
import type { CompositeBlockObjectGrid } from './CompositeBlockObjectGrid';

export class Asteroid extends CompositeBlockObject {
  constructor(
    grid: Grid,
    private readonly objectGrid?: CompositeBlockObjectGrid<CompositeBlockObject>,
    initialBlocks?: [GridCoord, BlockInstance][],
    initialTransform?: Partial<BlockEntityTransform>
  ) {
    super(grid, initialBlocks, initialTransform);
  }

  public override update(dt: number): void {
    const t = this.transform;

    t.position.x += t.velocity.x * dt;
    t.position.y += t.velocity.y * dt;
    t.rotation += t.angularVelocity * dt;

    this.updateBlockPositions();

    if (this.objectGrid) {
      this.objectGrid.update(this);
    }
  }

  public onDestroyed(): void {
    // No-op for now; destruction side effects are handled externally
  }
}
