// src/systems/pickups/helpers/getTierFromBlockId.ts

import type { BlockType } from "@/game/interfaces/types/BlockType";
import { getBlockType } from "@/game/blocks/BlockRegistry";

export function getTierFromBlockId(id: string): number {
  if (id.startsWith('cockpit')) return 10;
  const match = id.match(/(\d{1,2})$/);
  return match ? parseInt(match[1], 10) : 0;
}

export function getNextTierBlockFromBlockId(id: string): string {
  const tier = getTierFromBlockId(id);
  const nextTier = tier + 1;
  return id.replace(/\d+$/, String(nextTier));
}

// Tier 0 blocks are reserved for system (e.g. enemies), but they should still drop blocks.
// If they do drop blocks, we convert them to their tier 1 equivalent.
export function getTier1BlockIfTier0(blockType: BlockType): BlockType {
  const tier = getTierFromBlockId(blockType.id);
  if (tier === 0) {
    const newId = blockType.id.replace(/\d+$/, '1');
    return getBlockType(newId)!;
  }
  return blockType;
}
