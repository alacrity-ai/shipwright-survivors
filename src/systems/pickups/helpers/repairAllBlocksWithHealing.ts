// src/game/helpers/repairAllBlocksWithHealing.ts

import type { Ship } from '@/game/ship/Ship';
import type { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';

/**
 * Applies a fixed healing amount to each damaged block on a ship.
 * Does NOT consume currency. Does NOT over-heal. Does NOT prioritize.
 *
 * @param ship - The target ship whose blocks are to be repaired.
 * @param repairAmount - Amount of HP to restore to each damaged block.
 * @param shipBuilderEffectsSystem - Effect system used to visualize each repair.
 */
export function repairAllBlocksWithHealing(
  ship: Ship,
  repairAmount: number,
  shipBuilderEffects: ShipBuilderEffectsSystem
): void {
  if (repairAmount <= 0) return;

  const damagedBlocks = ship.getAllBlocks()
    .filter(([, block]) => block.hp < block.type.armor);

  for (const [, block] of damagedBlocks) {
    const missingHp = block.type.armor - block.hp;
    const heal = Math.min(missingHp, repairAmount);

    if (heal > 0) {
      block.hp += heal;
      shipBuilderEffects.createRepairEffect(block.position!);
    }
  }
}
