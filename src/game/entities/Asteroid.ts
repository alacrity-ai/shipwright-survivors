// src/game/entities/Asteroid.ts

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';

import { CompositeBlockObject } from './CompositeBlockObject';
import { Grid } from '@/systems/physics/Grid';

export class Asteroid extends CompositeBlockObject {
  constructor(
    grid: Grid,
    initialBlocks?: [GridCoord, BlockInstance][],
    initialTransform?: Partial<BlockEntityTransform>
  ) {
    super(grid, initialBlocks, initialTransform);
  }

  public override update(dt: number): void {
    const t = this.transform;
    // Simple inertial motion update
    t.position.x += t.velocity.x * dt;
    t.position.y += t.velocity.y * dt;
    t.rotation += t.angularVelocity * dt;

    this.updateBlockPositions();
  }

  public onDestroyed(): void {
    // No-op for now; destruction side effects are handled externally
  }
}
