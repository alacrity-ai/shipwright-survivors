// src/systems/subsystems/utils/BlockRepairUtils.ts

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';

export function getRepairCost(block: BlockInstance): number {
  const { type, hp } = block;
  const missingHp = Math.max(0, type.armor - hp);
  if (missingHp === 0) return 0;

  const costPerHp = type.cost / type.armor;
  return Math.ceil(costPerHp * missingHp);
}
