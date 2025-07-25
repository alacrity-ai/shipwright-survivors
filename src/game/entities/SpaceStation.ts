// src/game/entities/SpaceStation.ts

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';

import { Faction } from '@/game/interfaces/types/Faction';
import { FACTION_TO_INDEX } from '@/game/interfaces/types/Faction';
import { CompositeBlockObject } from './CompositeBlockObject';

import { getBlockIndexByType } from '@/game/blocks/BlockRegistry';

export class SpaceStation extends CompositeBlockObject {
  constructor(
    initialBlocks?: { coord: GridCoord; typeId: string; rotation?: number }[],
    initialTransform?: Partial<BlockEntityTransform>
  ) {
    super(initialBlocks, initialTransform); // CompositeBlockObject now only needs transform

    this.setImmoveable(true);

    if (initialBlocks && initialBlocks.length > 0) {
      const orchestrator = this.getBlockOrchestrator();
      for (const { coord, typeId, rotation } of initialBlocks) {
        const typeIndex = getBlockIndexByType(typeId);
        if (typeIndex === -1 || typeIndex === undefined) {
          console.warn(`Unknown block type: ${typeId}`);
          continue;
        }

        orchestrator.createAndRegisterBlock(
          {
            ownerShipId: this.numericId,
            ownerFaction: FACTION_TO_INDEX[Faction.Neutral],
            typeIndex,
            localX: coord.x,
            localY: coord.y,
            localRotation: rotation ?? 0,
            blockTypeId: typeId,
          },
          this.getTransform()
        );
      }
    }
  }

  public override update(_dt: number): void {
    // Stations are static — nothing to do unless docking/interaction logic is added.
  }

  public override onDestroyed(): void {
    // Could trigger explosion effects or mission events here.
  }

  /**
   * Places a new block into the station using the orchestrator and SOA store.
   */
  public placeBlockById(coord: GridCoord, blockId: string, rotation?: number): void {
    const typeIndex = getBlockIndexByType(blockId);
    if (typeIndex === -1) {
      throw new Error(`Unknown block type: ${blockId}`);
    }

    const orchestrator = this.getBlockOrchestrator();
    if (!typeIndex) return;

    orchestrator.createAndRegisterBlock(
      {
        ownerShipId: this.numericId,
        ownerFaction: FACTION_TO_INDEX[Faction.Neutral],
        typeIndex,
        localX: coord.x,
        localY: coord.y,
        localRotation: rotation ?? 0,
        blockTypeId: blockId,
      },
      this.getTransform()
    );
  }
}
