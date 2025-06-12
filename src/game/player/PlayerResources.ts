// src/game/player/PlayerResources.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';

export class PlayerResources {
  private static instance: PlayerResources;
  
  private currency: number = 0;
  private blockCount: number = 0;
  private lastGatheredBlock: BlockType | null = null;

  private onCurrencyChangeCallbacks: Set<(newValue: number) => void> = new Set();

  private constructor() {}

  public static getInstance(): PlayerResources {
    if (!PlayerResources.instance) {
      PlayerResources.instance = new PlayerResources();
    }
    return PlayerResources.instance;
  }

  public initialize(startingCurrency: number = 0): void {
    this.currency = startingCurrency;
  }

  public getCurrency(): number {
    return this.currency;
  }

  public hasEnoughCurrency(amount: number): boolean {
    return this.currency >= amount;
  }

  public addCurrency(amount: number): number {
    if (amount <= 0) return this.currency;

    this.currency += amount;
    this.notifyCurrencyChange();
    return this.currency;
  }

  public spendCurrency(amount: number): boolean {
    if (amount <= 0) return true;
    if (this.currency < amount) return false;

    this.currency -= amount;
    this.notifyCurrencyChange();
    return true;
  }

  public getBlockCount(): number {
    return this.blockCount;
  }

  public incrementBlockCount(amount: number): number {
    this.blockCount = Math.max(0, this.blockCount += amount);
    return this.blockCount;
  }

  public setLastGatheredBlock(blockType: BlockType): void {
    this.lastGatheredBlock = blockType;
  }

  public getLastGatheredBlock(): BlockType | null {
    return this.lastGatheredBlock;
  }

  public hasBlocks(): boolean {
    return this.blockCount > 0;
  }

  /**
   * Register a callback for currency changes.
   * Returns a disposer to unsubscribe the callback.
   */
  public onCurrencyChange(callback: (newValue: number) => void): () => void {
    this.onCurrencyChangeCallbacks.add(callback);

    return () => {
      this.onCurrencyChangeCallbacks.delete(callback);
    };
  }

  private notifyCurrencyChange(): void {
    for (const callback of this.onCurrencyChangeCallbacks) {
      callback(this.currency);
    }
  }

  public reset(): void {
    this.currency = 0;
    this.notifyCurrencyChange();
  }

  public destroy(): void {
    this.currency = 0;
    this.blockCount = 0;
    this.onCurrencyChangeCallbacks.clear();
  }

  public postMissionClear(): void {
    // Retain currency between missions
    this.blockCount = 0;
    this.onCurrencyChangeCallbacks.clear();
  }
}
