import type { Ship } from '@/game/ship/Ship';
import type { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { audioManager } from '@/audio/Audio';
import { randomInRange } from '@/shared/mathUtils';

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

  const damagedBlocks = ship.getAllBlocks()
    .filter(([, block]) => block.hp < block.type.armor);

  if (damagedBlocks.length === 0) return;

  const [_, block] = damagedBlocks[Math.floor(Math.random() * damagedBlocks.length)];
  const missingHp = block.type.armor - block.hp;
  const heal = Math.min(missingHp, repairAmount);

  if (heal > 0) {
    if (isLifeSteal) {
      const shipPos = ship.getTransform().position;
      createLightFlash(shipPos.x, shipPos.y, 600, 1.2, 0.7, '#ff3333');
      const pitch = randomInRange(1.1, 1.4);
      audioManager.play('assets/sounds/sfx/magic/magic_poof.wav', 'sfx', { pitch, maxSimultaneous: 3 });
    }

    block.hp += heal;
    shipBuilderEffects.createRepairEffect(block.position!, 48, 0.5, colorPalette);
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
