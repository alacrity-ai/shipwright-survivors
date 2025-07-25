// src/systems/pickups/helpers/repairAllBlocksWithHealing.ts

import type { Ship } from '@/game/ship/Ship';
import type { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { audioManager } from '@/audio/Audio';
import { randomInRange } from '@/shared/mathUtils';

import { BlockManager } from '@/game/blocks/system/BlockManager';
import { getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';

/**
 * Applies a fixed healing amount to each damaged block on a ship.
 * Does NOT consume currency. Does NOT over-heal. Does NOT prioritize.
 *
 * @param ship - The target ship whose blocks are to be repaired.
 * @param repairAmount - Amount of HP to restore to each damaged block.
 * @param shipBuilderEffects - Effect system used to visualize each repair.
 */
export function repairAllBlocksWithHealing(
  ship: Ship,
  repairAmount: number,
  shipBuilderEffects: ShipBuilderEffectsSystem
): void {
  if (repairAmount <= 0) return;

  const store = BlockManager.getInstance().getBlockStore();

  // Iterate over all block indices for this ship
  const blockIndices = ship.getAllBlockIndices();

  for (const idx of blockIndices) {
    const typeIdx = store.typeIndex[idx];
    const blockType = getBlockTypeByIndex(typeIdx);
    if (!blockType) continue;

    const maxHp = blockType.armor ?? 0;
    const currentHp = store.hp[idx];

    if (currentHp >= maxHp) continue; // Skip undamaged blocks

    const missingHp = maxHp - currentHp;
    const heal = Math.min(missingHp, repairAmount);

    if (heal > 0) {
      store.hp[idx] = currentHp + heal;

      // Trigger repair effect at block's world position
      shipBuilderEffects.createRepairEffect({
        x: store.worldX[idx],
        y: store.worldY[idx],
      });
    }
  }
}

/**
 * Repairs a single randomly chosen damaged block on the ship.
 * Does NOT consume currency. Does NOT over-heal. Triggers visual effect.
 *
 * @param ship - The target ship whose blocks are to be checked.
 * @param repairAmount - Maximum HP to restore to the selected block.
 * @param shipBuilderEffects - Effect system used to visualize the repair.
 * @param colorPalette - Optional palette override for the repair effect.
 */
export function repairRandomBlockWithHealing(
  ship: Ship,
  repairAmount: number,
  shipBuilderEffects: ShipBuilderEffectsSystem,
  colorPalette?: string[],
  isLifeSteal?: boolean
): void {
  if (repairAmount <= 0) return;

  const store = BlockManager.getInstance().getBlockStore();
  const blockIndices = ship.getAllBlockIndices();

  // Collect only damaged blocks
  const damagedIndices: number[] = [];
  for (const idx of blockIndices) {
    const typeIdx = store.typeIndex[idx];
    const blockType = getBlockTypeByIndex(typeIdx);
    if (!blockType) continue;

    if (store.hp[idx] < (blockType.armor ?? 0)) {
      damagedIndices.push(idx);
    }
  }

  if (damagedIndices.length === 0) return;

  // Pick a random damaged block
  const blockIdx = damagedIndices[Math.floor(Math.random() * damagedIndices.length)];
  const typeIdx = store.typeIndex[blockIdx];
  const blockType = getBlockTypeByIndex(typeIdx)!;

  const maxHp = blockType.armor ?? 0;
  const currentHp = store.hp[blockIdx];
  const missingHp = maxHp - currentHp;
  const heal = Math.min(missingHp, repairAmount);

  if (heal > 0) {
    if (isLifeSteal) {
      const shipPos = ship.getTransform().position;
      createLightFlash(shipPos.x, shipPos.y, 600, 1.2, 0.7, '#ff3333', `lifesteal-${ship.id}`);
      const pitch = randomInRange(1.1, 1.4);
      audioManager.play('assets/sounds/sfx/magic/magic_poof.wav', 'sfx', { pitch, maxSimultaneous: 3 });
    }

    store.hp[blockIdx] = currentHp + heal;

    shipBuilderEffects.createRepairEffect(
      { x: store.worldX[blockIdx], y: store.worldY[blockIdx] },
      48,
      0.5,
      colorPalette
    );
  }
}

/**
 * Repairs a random damaged block using a lifesteal visual (red hues).
 * Useful for on-hit healing, vampiric weapons, or passive leech effects.
 *
 * @param ship - The target ship.
 * @param healAmount - The amount of HP to restore.
 * @param shipBuilderEffects - Effect system used to visualize the repair.
 */
export function repairBlockViaLifesteal(
  ship: Ship,
  healAmount: number,
  shipBuilderEffects: ShipBuilderEffectsSystem
): void {
  const lifestealPalette = ['#ff3333', '#ff6666', '#ff0000', '#ff4444', '#cc0000'];
  repairRandomBlockWithHealing(ship, healAmount, shipBuilderEffects, lifestealPalette, true);
}
