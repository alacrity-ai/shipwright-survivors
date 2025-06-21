// src/game/entities/Asteroid.ts

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';

import { CompositeBlockObjectRegistry } from './registries/CompositeBlockObjectRegistry';

import { CompositeBlockObject } from './CompositeBlockObject';
import { Grid } from '@/systems/physics/Grid';
import type { CompositeBlockObjectGrid } from './CompositeBlockObjectGrid';

export class Asteroid extends CompositeBlockObject {
  constructor(
    grid: Grid,
    private readonly objectGrid: CompositeBlockObjectGrid<CompositeBlockObject>,
    initialBlocks?: [GridCoord, BlockInstance][],
    initialTransform?: Partial<BlockEntityTransform>
  ) {
    super(grid, initialBlocks, initialTransform);
  }

  public override update(dt: number): void {
    const t = this.transform;

    // Apply physics
    t.position.x += t.velocity.x * dt;
    t.position.y += t.velocity.y * dt;
    t.rotation += t.angularVelocity * dt;

    this.updateBlockPositions();
    this.objectGrid.update(this);
  }


  public override onDestroyed(): void {
    CompositeBlockObjectRegistry.getInstance().remove(this);
    this.objectGrid.remove(this);
  }
}
