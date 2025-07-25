// src/game/entities/Asteroid.ts

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';

import { CompositeBlockObjectRegistry } from './registries/CompositeBlockObjectRegistry';
import { CompositeBlockObject } from './CompositeBlockObject';
import type { CompositeBlockObjectGrid } from './CompositeBlockObjectGrid';
import { Faction } from '@/game/interfaces/types/Faction';

export class Asteroid extends CompositeBlockObject {
  constructor(
    private readonly objectGrid: CompositeBlockObjectGrid<CompositeBlockObject>,
    initialBlocks?: Array<{ coord: GridCoord; typeId: string; rotation?: number }>,
    initialTransform?: Partial<BlockEntityTransform>,
    faction: Faction = Faction.Neutral
  ) {
    // CompositeBlockObject now handles orchestrator setup and block creation
    super(initialBlocks, initialTransform, faction);
  }

  public override update(dt: number): void {
    const t = this.getTransform();

    // Apply simple drift physics
    t.position.x += t.velocity.x * dt;
    t.position.y += t.velocity.y * dt;
    t.rotation += t.angularVelocity * dt;

    this.updateBlockPositions(); // updates BlockStore world coords + grid rehoming
    this.objectGrid.update(this);
  }

  public override onDestroyed(): void {
    CompositeBlockObjectRegistry.getInstance().remove(this);
    this.objectGrid.remove(this);
  }
}
