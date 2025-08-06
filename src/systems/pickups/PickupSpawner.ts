// src/systems/pickups/PickupSpawner.ts

import { GlobalEventBus } from '@/core/EventBus';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import { PickupSystem } from '@/systems/pickups/PickupSystem';
import { missionLoader } from '@/game/missions/MissionLoader';
import { PlayerPassiveManager } from '@/game/player/PlayerPassiveManager';
import { missionSettings } from '@/game/player/PlayerMissionManager';

import { BlockManager } from '@/game/blocks/system/BlockManager';
import { getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';
import type { BlockStore } from '@/game/blocks/system/BlockStore';


export class PickupSpawner {
  private pickupSystem: PickupSystem;
  private store: BlockStore;
  private pickupDropsDisabled: boolean = false;

  constructor(pickupSystem: PickupSystem) {
    this.pickupSystem = pickupSystem;
    this.store = BlockManager.getInstance().getBlockStore();

    GlobalEventBus.on('pickup:spawn:block', this.handleSpawnBlockPickup);
    GlobalEventBus.on('pickup:spawn:currency', this.handleSpawnCurrencyPickup);
    GlobalEventBus.on('pickup:spawn:repair', this.handleSpawnRepairPickup);
    GlobalEventBus.on('pickup:spawn:quantumAttractor', this.handleSpawnQuantumAttractor);
    GlobalEventBus.on('pickup:spawn:shipBlueprint', this.handleSpawnShipBlueprint);
    GlobalEventBus.on('pickup:disableDrops', this.handleDisableDrops);
    GlobalEventBus.on('pickup:enableDrops', this.handleEnableDrops);
  }

  // === Event Handlers ===

  private handleDisableDrops = (): void => {
    this.pickupDropsDisabled = true;
  };

  private handleEnableDrops = (): void => {
    this.pickupDropsDisabled = false;
  };

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

  private handleSpawnQuantumAttractor = ({
    x,
    y,
  }: {
    x: number;
    y: number;
  }): void => {
    this.pickupSystem.spawnQuantumAttractorPickup({ x, y });
  };

  private handleSpawnShipBlueprint = ({
    x,
    y,
    shipId,
  }: {
    x: number;
    y: number;
    shipId: string;
  }): void => {
    this.pickupSystem.spawnShipBlueprintPickup({ x, y }, shipId);
  };

  // === Destruction / cleanup ===

  public destroy(): void {
    GlobalEventBus.off('pickup:spawn:block', this.handleSpawnBlockPickup);
    GlobalEventBus.off('pickup:spawn:currency', this.handleSpawnCurrencyPickup);
    GlobalEventBus.off('pickup:spawn:repair', this.handleSpawnRepairPickup);
    GlobalEventBus.off('pickup:spawn:quantumAttractor', this.handleSpawnQuantumAttractor);
    GlobalEventBus.off('pickup:spawn:shipBlueprint', this.handleSpawnShipBlueprint);
    GlobalEventBus.off('pickup:disableDrops', this.handleDisableDrops);
    GlobalEventBus.off('pickup:enableDrops', this.handleEnableDrops);
  }

  // === Block destruction hooks ===

  spawnPickupOnBlockDestruction(
    blockIndex: number,
    blockDropRateMulti: number,
    entropiumDropRateMulti: number = 1.0,
    repairOrbDropRateMulti: number = 0
  ): void {
    if (this.pickupDropsDisabled) return;

    const store = this.store;

    // Validate the block slot
    if (!store.isAllocated(blockIndex) || store.destroyed[blockIndex]) {
      return;
    }

    // === Drop rate calculation using cached SOA field ===
    const baseDropRate = store.dropRate[blockIndex];
    const missionMultiplier = missionLoader.getDropMultiplier();
    const passiveDropMultiplier = PlayerPassiveManager.getInstance().getPassiveBonus('block-drop-rate');
    const effectiveDropRate = Math.min(
      baseDropRate * missionMultiplier * passiveDropMultiplier * blockDropRateMulti,
      1.0
    );

    // World-space fallback to local position
    const pickupPosition = {
      x: store.worldX?.[blockIndex] ?? store.localX[blockIndex],
      y: store.worldY?.[blockIndex] ?? store.localY[blockIndex],
    };

    // === Primary block pickup ===
    if (Math.random() < effectiveDropRate * missionSettings.getGlobalBlockDropRate()) {
      // If spawnBlockPickup still needs a BlockType, resolve it lazily (but only here)
      const typeIndex = store.typeIndex[blockIndex];
      const blockType = getBlockTypeByIndex(typeIndex);
      this.pickupSystem.spawnBlockPickup(pickupPosition, blockType!);
      return;
    }

    // === Sub-drops: repair orbs or currency ===
    if (Math.random() < 0.2) {
      const repairOrbChance = 0.07 * (
        PlayerPassiveManager.getInstance().getPassiveBonus('repair-orb-drop-rate') + repairOrbDropRateMulti
      );

      if (Math.random() < repairOrbChance) {
        const repairAmount = this.getRepairAmountForBlock(blockIndex);
        this.pickupSystem.spawnRepairPickup(pickupPosition, repairAmount);
      } else if (Math.random() < (0.8 * entropiumDropRateMulti)) {
        let currencyAmount = this.getCurrencyAmountForBlock(blockIndex);
        const currencyMultiplier = PlayerPassiveManager.getInstance().getPassiveBonus('entropium-pickup-bonus');
        currencyAmount = Math.floor(currencyAmount * currencyMultiplier);
        this.pickupSystem.spawnCurrencyPickup(pickupPosition, currencyAmount);
      }
    }
  }


  private getCurrencyAmountForBlock(blockIndex: number): number {
    // Directly read tier from SOA (already cached at block creation)
    const tier = this.store.tier[blockIndex];

    const tierToBaseValue: Record<number, number> = {
      0: 15, 1: 35, 2: 60, 3: 80, 4: 120, 5: 200,
      6: 250, 7: 250, 8: 250, 9: 250, 10: 250,
    };

    const base = tierToBaseValue[tier] ?? 0;
    const bonus = Math.floor(Math.random() * 1.5);

    return base + bonus;
  }

  private getRepairAmountForBlock(blockIndex: number): number {
    // Directly read tier from SOA (already cached at block creation)
    const tier = this.store.tier[blockIndex];

    const tierToBaseRepair: Record<number, number> = {
      0: 10, 1: 15, 2: 20, 3: 30, 4: 40,
      5: 55, 6: 70, 7: 80, 8: 90, 9: 95, 10: 100,
    };

    const base = tierToBaseRepair[tier] ?? 5;
    const variance = Math.floor(Math.random() * 2);

    return base + variance;
  }
}
