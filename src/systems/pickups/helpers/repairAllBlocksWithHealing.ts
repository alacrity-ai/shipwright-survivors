// src/systems/pickups/helpers/repairAllBlocksWithHealing.ts

import type { Ship } from '@/game/ship/Ship';
import type { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { audioManager } from '@/audio/Audio';
import { randomInRange } from '@/shared/mathUtils';

import { BlockManager } from '@/game/blocks/system/BlockManager';

/**
 * Applies a fixed healing amount to each damaged block on a ship.
 * Does NOT consume currency. Does NOT over-heal. Does NOT prioritize.
 */
export function repairAllBlocksWithHealing(
  ship: Ship,
  repairAmount: number,
  shipBuilderEffects: ShipBuilderEffectsSystem
): void {
  if (repairAmount <= 0) return;

  const manager = BlockManager.getInstance();
  const store = manager.getBlockStore();
  const orchestrator = manager.getBlockOrchestrator();
  const blockIndices = ship.getAllBlockIndices();

  for (const idx of blockIndices) {
    const maxHp = store.armor[idx] ?? 0;
    const currentHp = store.hp[idx];
    if (currentHp >= maxHp) continue;

    const heal = Math.min(maxHp - currentHp, repairAmount);
    if (heal > 0) {
      store.hp[idx] = currentHp + heal;

      orchestrator.updateDamageUV(idx);
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
 */
export function repairRandomBlockWithHealing(
  ship: Ship,
  repairAmount: number,
  shipBuilderEffects: ShipBuilderEffectsSystem,
  colorPalette?: string[],
  isLifeSteal?: boolean
): void {
  if (repairAmount <= 0) return;

  const manager = BlockManager.getInstance();
  const store = manager.getBlockStore();
  const orchestrator = manager.getBlockOrchestrator();
  const blockIndices = ship.getAllBlockIndices();

  // Collect damaged blocks using armor[] directly (no BlockType lookups)
  const damagedIndices: number[] = [];
  for (const idx of blockIndices) {
    const maxHp = store.armor[idx] ?? 0;
    if (store.hp[idx] < maxHp) {
      damagedIndices.push(idx);
    }
  }
  if (damagedIndices.length === 0) return;

  // Pick a random damaged block
  const blockIdx = damagedIndices[Math.floor(Math.random() * damagedIndices.length)];
  const maxHp = store.armor[blockIdx] ?? 0;
  const currentHp = store.hp[blockIdx];
  const heal = Math.min(maxHp - currentHp, repairAmount);

  if (heal > 0) {
    if (isLifeSteal) {
      const shipPos = ship.getTransform().position;
      createLightFlash(shipPos.x, shipPos.y, 600, 1.2, 0.7, '#ff3333', `lifesteal-${ship.id}`);
      const pitch = randomInRange(1.1, 1.4);
      audioManager.play('assets/sounds/sfx/magic/magic_poof.wav', 'sfx', { pitch, maxSimultaneous: 3 });
    }

    store.hp[blockIdx] = currentHp + heal;
    orchestrator.updateDamageUV(blockIdx);
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
 */
export function repairBlockViaLifesteal(
  ship: Ship,
  healAmount: number,
  shipBuilderEffects: ShipBuilderEffectsSystem
): void {
  const lifestealPalette = ['#ff3333', '#ff6666', '#ff0000', '#ff4444', '#cc0000'];
  repairRandomBlockWithHealing(ship, healAmount, shipBuilderEffects, lifestealPalette, true);
}
