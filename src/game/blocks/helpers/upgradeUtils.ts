// src/game/blocks/helpers/upgradeUtils.ts

import type { Ship } from '@/game/ship/Ship';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockType } from '@/game/interfaces/types/BlockType';

import { BlockManager } from '@/game/blocks/system/BlockManager';
import { getNextTierBlock, getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';

/**
 * Upgrades all blocks on the ship matching the given affinity tags,
 * advancing their tier by `tierDelta` (clamped to max tier).
 *
 * Uses SOA BlockStore instead of BlockInstance objects.
 */
export function upgradeAffinityBlocksOnShip(
  ship: Ship,
  affinityTags: string[],
  tierDelta: number
): void {
  const store = BlockManager.getInstance().getBlockStore();
  const indices = ship.getAllBlockIndices();

  const upgrades: Array<{
    coord: GridCoord;
    newBlockId: string;
    rotation: number;
  }> = [];

  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    const typeIndex = store.typeIndex[idx];
    const blockType = getBlockTypeByIndex(typeIndex);
    if (!blockType) continue;

    const [tag] = blockType.metatags ?? [];
    if (!tag || !affinityTags.includes(tag)) continue;

    const upgradedType = getNextTierBlock(blockType, tierDelta);
    if (!upgradedType || upgradedType.tier <= blockType.tier) continue;

    upgrades.push({
      coord: { x: store.localX[idx], y: store.localY[idx] },
      newBlockId: upgradedType.id,
      rotation: store.rotation[idx] ?? 0,
    });
  }

  for (const { coord, newBlockId, rotation } of upgrades) {
    ship.removeBlock(coord);
    ship.placeBlockById(coord, newBlockId, rotation);
  }
}

/**
 * Upgrades a single block (by SOA index) by `delta` tiers (default 1).
 * Removes the old block and places a new one in its place.
 */
export function upgradeBlockIndexOnShip(
  ship: Ship,
  blockIndex: number,
  delta: number = 1
): boolean {
  const store = BlockManager.getInstance().getBlockStore();
  const typeIndex = store.typeIndex[blockIndex];
  const blockType = getBlockTypeByIndex(typeIndex);
  if (!blockType) return false;

  const upgradedType = getNextTierBlock(blockType, delta);
  if (!upgradedType || upgradedType.tier <= blockType.tier) return false;

  const coord: GridCoord = { x: store.localX[blockIndex], y: store.localY[blockIndex] };
  const rotation = store.rotation[blockIndex] ?? 0;

  ship.removeBlock(coord);
  ship.placeBlockById(coord, upgradedType.id, rotation);

  return true;
}

/**
 * Replaces a block (by SOA index) with a new type, preserving coord and rotation.
 */
export function replaceBlockOnShipByIndex(
  ship: Ship,
  blockIndex: number,
  newType: BlockType
): boolean {
  const store = BlockManager.getInstance().getBlockStore();
  if (!store.isAllocated(blockIndex)) return false;

  const coord: GridCoord = { x: store.localX[blockIndex], y: store.localY[blockIndex] };
  const rotation = store.rotation[blockIndex] ?? 0;

  ship.removeBlock(coord);
  ship.placeBlockById(coord, newType.id, rotation);

  return true;
}
