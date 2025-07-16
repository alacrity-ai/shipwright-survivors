// src/game/blocks/helpers/upgradeBlocksOnShip.ts

import type { Ship } from '@/game/ship/Ship';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { BlockType } from '@/game/interfaces/types/BlockType';

import { getNextTierBlock } from '@/game/blocks/BlockRegistry';

/**
 * Upgrades all blocks on the ship matching the given affinity tags,
 * advancing their tier by `tierDelta` (clamped to max tier).
 * 
 * Blocks are removed and re-placed in-place to trigger proper subsystem updates.
 */
export function upgradeAffinityBlocksOnShip(
  ship: Ship,
  affinityTags: string[],
  tierDelta: number
): void {
  const upgrades: Array<{
    coord: GridCoord;
    newBlockId: string;
    rotation: number;
  }> = [];

  for (const [, block] of ship.getAllBlocks()) {
    const [tag] = block.type.metatags ?? [];
    if (!tag || !affinityTags.includes(tag)) continue;

    const upgradedType = getNextTierBlock(block.type, tierDelta);
    if (!upgradedType || upgradedType.tier <= block.type.tier) continue;

    const coord = ship.getBlockCoord(block);
    if (!coord) continue;

    upgrades.push({
      coord,
      newBlockId: upgradedType.id,
      rotation: block.rotation ?? 0,
    });
  }

  for (const { coord, newBlockId, rotation } of upgrades) {
    ship.removeBlock(coord);
    ship.placeBlockById(coord, newBlockId, rotation);
  }
}

/**
 * Upgrades a single block on the given ship by `delta` tiers (default 1).
 * Removes the old block and places a new one in its place.
 * Returns true if the upgrade occurred.
 */
export function upgradeBlockInstanceOnShip(
  ship: Ship,
  block: BlockInstance,
  delta: number = 1
): boolean {
  const upgradedType = getNextTierBlock(block.type, delta);
  if (!upgradedType || upgradedType.tier <= block.type.tier) return false;

  const coord: GridCoord | null = ship.getBlockCoord(block);
  if (!coord) return false;

  const rotation = block.rotation ?? 0;

  ship.removeBlock(coord);
  ship.placeBlockById(coord, upgradedType.id, rotation);

  return true;
}

/**
 * Replaces a block instance on the ship with a new block of the given type.
 * Preserves rotation and coordinate.
 * Returns true if the replacement succeeded.
 */
export function replaceBlockOnShip(
  ship: Ship,
  block: BlockInstance,
  newType: BlockType
): boolean {
  const coord: GridCoord | null = ship.getBlockCoord(block);
  if (!coord) return false;

  const rotation = block.rotation ?? 0;

  ship.removeBlock(coord);
  ship.placeBlockById(coord, newType.id, rotation);

  return true;
}