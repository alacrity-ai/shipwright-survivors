// src/game/entities/SpaceStation.ts

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';

import { getBlockType } from '../blocks/BlockRegistry';
import { CompositeBlockObject } from './CompositeBlockObject';
import { Grid } from '@/systems/physics/Grid';

export class SpaceStation extends CompositeBlockObject {
  constructor(
    grid: Grid,
    initialBlocks?: [GridCoord, BlockInstance][],
    initialTransform?: Partial<BlockEntityTransform>
  ) {
    super(grid, initialBlocks, initialTransform);
    this.setImmoveable(true);
  }

  public override update(_dt: number): void {
    // Space stations do not move — static entities.
    // If needed, implement docking logic here in the future.
  }

  public override onDestroyed(): void {
    // Trigger an explosion cascade, mission failure, etc.
    // Leave no-op for now.
  }

  placeBlockById(coord: GridCoord, blockId: string, rotation?: number): void {
    const type = getBlockType(blockId);
    if (!type) throw new Error(`Unknown block type: ${blockId}`);

    // Calculate the proper world position immediately
    const worldPos = this.calculateBlockWorldPosition(coord);  // Use the helper method to calculate world position
    
    const block: BlockInstance = {
      type,
      hp: type.armor,
      ownerShipId: this.id,  // Associate the block with this ship's ID
      position: worldPos,  // Set the calculated world position
      ...(rotation !== undefined ? { rotation } : {})  // Set the rotation if provided
    };

    this.placeBlock(coord, block);  // Place the block into the grid and the ship
  }

}
