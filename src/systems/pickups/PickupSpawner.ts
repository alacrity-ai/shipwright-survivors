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
   * Determines the amount of currency to spawn based on the block type.
   * @param block The block that was destroyed.
   * @returns The amount of currency to spawn.
   */
  private getCurrencyAmountForBlock(block: BlockInstance): number {
    switch (block.type.id) {
      case 'cockpit':
        return 200; // High value for cockpit
      case 'engine0':
      case 'engine1':
        return 50; // Moderate value for engines
      case 'turret0':
      case 'turret1':
        return 75; // High value for turrets
      default:
        return 25; // Default low value for other blocks
    }
  }
}
