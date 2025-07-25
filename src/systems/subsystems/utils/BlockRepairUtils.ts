// src/systems/subsystems/utils/BlockRepairUtils.ts

import { BlockManager } from '@/game/blocks/system/BlockManager';
import { getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';

/**
 * Computes the repair cost for a single block by index.
 * Uses BlockStore for HP and BlockRegistry for type data.
 *
 * @param blockIndex - SOA index of the block.
 * @param store - Optional BlockStore (avoids repeated lookups).
 * @returns The repair cost in currency units (0 if at full HP).
 */
export function getRepairCost(blockIndex: number): number {
  const blockStore = BlockManager.getInstance().getBlockStore();
  const typeIdx = blockStore.typeIndex[blockIndex];
  const blockType = getBlockTypeByIndex(typeIdx);
  if (!blockType) return 0;

  const hp = blockStore.hp[blockIndex];
  const maxHp = blockType.armor ?? 0;
  const missingHp = Math.max(0, maxHp - hp);
  if (missingHp === 0 || maxHp === 0) return 0;

  const costPerHp = (blockType.cost ?? 0) / maxHp;
  return Math.ceil(costPerHp * missingHp);
}
