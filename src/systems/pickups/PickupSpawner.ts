// src/systems/pickups/PickupSpawner.ts

import { PickupSystem } from '@/systems/pickups/PickupSystem';
import { getTierFromBlockId } from '@/systems/pickups/helpers/getTierFromBlockId';
import { missionLoader } from '@/game/missions/MissionLoader';

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';

export class PickupSpawner {
  private pickupSystem: PickupSystem;

  constructor(pickupSystem: PickupSystem) {
    this.pickupSystem = pickupSystem;
  }

  spawnPickupOnBlockDestruction(block: BlockInstance): void {
    const blockType = block.type;
    const baseDropRate = blockType.dropRate ?? 0;

    // === Apply dropMultiplier (only for block drops) ===
    const dropMultiplier = missionLoader.getDropMultiplier();
    const effectiveDropRate = Math.min(baseDropRate * dropMultiplier, 1.0);

    if (Math.random() < effectiveDropRate) {
      const pickupPosition = {
        x: block.position?.x ?? 0,
        y: block.position?.y ?? 0,
      };

      this.pickupSystem.spawnBlockPickup(pickupPosition, blockType);
      return;
    }

    // === Fallback drop (currency OR repair) - not affected by dropMultiplier ===
    if (Math.random() < 0.2) {
      const pickupPosition = {
        x: block.position?.x ?? 0,
        y: block.position?.y ?? 0,
      };

      if (Math.random() < 0.07) {
        const repairAmount = this.getRepairAmountForBlock(block);
        this.pickupSystem.spawnRepairPickup(pickupPosition, repairAmount);
      } else {
        const currencyAmount = this.getCurrencyAmountForBlock(block);
        this.pickupSystem.spawnCurrencyPickup(pickupPosition, currencyAmount);
      }
    }
  }

  private getCurrencyAmountForBlock(block: BlockInstance): number {
    const id = block.type.id;
    const tier = getTierFromBlockId(id);

    const tierToBaseValue: Record<number, number> = {
      0: 5, 1: 10, 2: 15, 3: 25, 4: 35, 5: 40,
      6: 45, 7: 50, 8: 60, 9: 75, 10: 80,
    };

    const base = tierToBaseValue[tier] ?? 0;
    const bonus = Math.floor(Math.random() * 1.5);

    return base + bonus;
  }

  private getRepairAmountForBlock(block: BlockInstance): number {
    const id = block.type.id;
    const tier = getTierFromBlockId(id);

    const tierToBaseRepair: Record<number, number> = {
      0: 10,
      1: 15,
      2: 20,
      3: 30,
      4: 40,
      5: 55,
      6: 70,
      7: 80,
      8: 90,
      9: 95,
      10: 100,
    };

    const base = tierToBaseRepair[tier] ?? 5;
    const variance = Math.floor(Math.random() * 2);

    return base + variance;
  }
}
