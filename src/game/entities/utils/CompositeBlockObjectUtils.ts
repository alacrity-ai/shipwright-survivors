// src/game/entities/utils/CompositeBlockObjectUtils.ts

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import { CompositeBlockObjectRegistry } from '@/game/entities/registries/CompositeBlockObjectRegistry';
import { BlockManager } from '@/game/blocks/system/BlockManager';

/**
 * Finds the owning CompositeBlockObject for a given block index.
 * @param blockIndex SOA index of the block
 * @returns The owning CompositeBlockObject, or null if none
 */
export function findObjectByBlockIndex(blockIndex: number): CompositeBlockObject | null {
  const store = BlockManager.getInstance().getBlockStore();
  const ownerShipId = store.ownerShipId[blockIndex];

  const registry = CompositeBlockObjectRegistry.getInstance();
  return registry.getByNumericId(ownerShipId) ?? null;
}

/**
 * Gets the local grid coordinates (within the owning object) for a given block index.
 * @param blockIndex SOA index of the block
 * @returns The local grid coordinate { x, y }
 */
export function findBlockCoordinatesInObjectByIndex(blockIndex: number): GridCoord {
  const store = BlockManager.getInstance().getBlockStore();
  return { x: store.localX[blockIndex], y: store.localY[blockIndex] };
}
