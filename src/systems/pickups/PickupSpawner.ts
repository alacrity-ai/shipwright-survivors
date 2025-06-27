// src/systems/pickups/PickupSpawner.ts

import { GlobalEventBus } from '@/core/EventBus';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import { PickupSystem } from '@/systems/pickups/PickupSystem';
import { getTierFromBlockId } from '@/systems/pickups/helpers/getTierFromBlockId';
import { missionLoader } from '@/game/missions/MissionLoader';
import { PlayerPassiveManager } from '@/game/player/PlayerPassiveManager';
import { SETTINGS } from '@/config/settings';


import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';

export class PickupSpawner {
  private pickupSystem: PickupSystem;

  constructor(pickupSystem: PickupSystem) {
    this.pickupSystem = pickupSystem;

    GlobalEventBus.on('pickup:spawn:block', this.handleSpawnBlockPickup);
    GlobalEventBus.on('pickup:spawn:currency', this.handleSpawnCurrencyPickup);
    GlobalEventBus.on('pickup:spawn:repair', this.handleSpawnRepairPickup); // NEW
  }

  // === Event Handlers ===

  private handleSpawnBlockPickup = ({
    x,
    y,
    blockTypeId,
  }: {
    x: number;
    y: number;
    blockTypeId: string;
  }): void => {
    const type = getBlockType(blockTypeId);
    if (!type) {
      console.warn(`[PickupSpawner] Unknown blockTypeId: ${blockTypeId}`);
      return;
    }

    this.pickupSystem.spawnBlockPickup({ x, y }, type);
  };

  private handleSpawnCurrencyPickup = ({
    x,
    y,
    currencyType,
    amount,
  }: {
    x: number;
    y: number;
    currencyType: string;
    amount: number;
  }): void => {
    this.pickupSystem.spawnCurrencyPickup({ x, y }, amount);
  };

  private handleSpawnRepairPickup = ({
    x,
    y,
    amount,
  }: {
    x: number;
    y: number;
    amount: number;
  }): void => {
    this.pickupSystem.spawnRepairPickup({ x, y }, amount);
  };

  // === Destruction / cleanup ===

  public destroy(): void {
    GlobalEventBus.off('pickup:spawn:block', this.handleSpawnBlockPickup);
    GlobalEventBus.off('pickup:spawn:currency', this.handleSpawnCurrencyPickup);
    GlobalEventBus.off('pickup:spawn:repair', this.handleSpawnRepairPickup); // NEW
  }

  // === Block destruction hooks ===

  spawnPickupOnBlockDestruction(block: BlockInstance): void {
    const blockType = block.type;

    const baseDropRate = blockType.dropRate ?? 0;
    const missionMultiplier = missionLoader.getDropMultiplier();
    const passiveDropMultiplier = PlayerPassiveManager.getInstance().getPassiveBonus('block-drop-rate');
    const effectiveDropRate = Math.min(baseDropRate * missionMultiplier * passiveDropMultiplier, 1.0);

    const pickupPosition = {
      x: block.position?.x ?? 0,
      y: block.position?.y ?? 0,
    };

    if (Math.random() < effectiveDropRate * SETTINGS.GLOBAL_BLOCK_DROP_RATE) {
      this.pickupSystem.spawnBlockPickup(pickupPosition, blockType);
      return;
    }

    // === Sub-drop: Repair or Currency
    if (Math.random() < 0.2) {
      const repairOrbChance = 0.07 * PlayerPassiveManager.getInstance().getPassiveBonus('repair-orb-drop-rate');

      if (Math.random() < repairOrbChance) {
        const repairAmount = this.getRepairAmountForBlock(block);
        this.pickupSystem.spawnRepairPickup(pickupPosition, repairAmount);
      } else {
        let currencyAmount = this.getCurrencyAmountForBlock(block);

        // Passive bonus to entropium gain
        const currencyMultiplier = PlayerPassiveManager.getInstance().getPassiveBonus('entropium-pickup-bonus');
        currencyAmount = Math.floor(currencyAmount * currencyMultiplier);

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
      0: 10, 1: 15, 2: 20, 3: 30, 4: 40,
      5: 55, 6: 70, 7: 80, 8: 90, 9: 95, 10: 100,
    };

    const base = tierToBaseRepair[tier] ?? 5;
    const variance = Math.floor(Math.random() * 2);

    return base + variance;
  }
}
