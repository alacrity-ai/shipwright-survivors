// src/systems/pickups/helpers/getTierFromBlockId.ts

import type { BlockType } from "@/game/interfaces/types/BlockType";
import { getBlockType } from "@/game/blocks/BlockRegistry";

/** Returns the tier of the block identified by its ID using the BlockRegistry. */
export function getTierFromBlockId(id: string): number {
  const blockType = getBlockType(id);
  return blockType?.tier ?? 0;
}

/** Attempts to return the next-tier block ID for a given block ID, assuming naming follows same prefix+tier format. */
export function getNextTierBlockFromBlockId(id: string): string {
  const blockType = getBlockType(id);
  if (!blockType) return 'hull1';

  const prefix = id.replace(/\d+$/, ''); // Strip numeric suffix
  const nextTierId = `${prefix}${blockType.tier + 1}`;
  return getBlockType(nextTierId) ? nextTierId : 'hull1';
}

/** Converts tier-0 blocks to their tier-1 equivalent using the naming convention. Falls back to hull1 if lookup fails. */
export function getTier1BlockIfTier0(blockType: BlockType): BlockType {
  if (blockType.tier === 0) {
    const newId = blockType.id.replace(/\d+$/, '1');
    return getBlockType(newId) ?? getBlockType('hull1')!;
  }
  return blockType;
}
