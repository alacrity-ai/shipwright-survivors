// src/systems/pickups/PickupSpawner.ts

import { PickupSystem } from '@/systems/pickups/PickupSystem'; 
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';

export class PickupSpawner {
  private pickupSystem: PickupSystem;

  constructor(pickupSystem: PickupSystem) {
    this.pickupSystem = pickupSystem;
  }

  /**
   * Spawns a pickup when a block is destroyed based on a random chance.
   * @param block The block that was destroyed.
   */
  spawnPickupOnBlockDestruction(block: BlockInstance): void {
    // Determine the chance of spawning a pickup (e.g., 30% chance)
    const spawnChance = Math.random();
    if (spawnChance < 0.3) { // 30% chance
      const currencyAmount = this.getCurrencyAmountForBlock(block);
      
      // Spawn the currency pickup at the block's position (slightly offset if necessary)
      const pickupPosition = {
        x: block.position?.x ?? 0,
        y: block.position?.y ?? 0,
      };

      this.pickupSystem.spawnCurrencyPickup(pickupPosition, currencyAmount);
    }
  }

  /**
   * Determines the amount of currency to spawn based on the block type and tier.
   * @param block The block that was destroyed.
   * @returns The amount of currency to spawn.
   */
  private getCurrencyAmountForBlock(block: BlockInstance): number {
    const id = block.type.id;

    if (id.startsWith('cockpit')) {
      return 10 + Math.floor(Math.random() * 26); // Cockpit always base 200 + [0–25]
    }

    // Extract tier from ID (expects format like 'engine3', 'turret1', etc.)
    const tierMatch = id.match(/(\d{1,2})$/);
    const tier = tierMatch ? parseInt(tierMatch[1], 10) : -1;

    const tierToBaseValue: Record<number, number> = {
      0: 5,
      1: 10,
      2: 25,
      3: 35,
      4: 50,
      5: 75,
      6: 100,
      7: 125,
      8: 175,
      9: 225,
      10: 300,
    };

    const baseValue = tierToBaseValue[tier] ?? 5;
    const randomBonus = Math.floor(Math.random() * 6); // [0–5]

    return baseValue + randomBonus;
  }
}
