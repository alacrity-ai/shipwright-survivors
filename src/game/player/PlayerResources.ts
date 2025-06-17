// src/game/player/PlayerResources.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';

export class PlayerResources {
  private static instance: PlayerResources;

  private currency: number = 0;
  private blockQueue: BlockType[] = [];

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

  // === Currency ===
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

  public onCurrencyChange(callback: (newValue: number) => void): () => void {
    this.onCurrencyChangeCallbacks.add(callback);
    return () => this.onCurrencyChangeCallbacks.delete(callback);
  }

  private notifyCurrencyChange(): void {
    for (const callback of this.onCurrencyChangeCallbacks) {
      callback(this.currency);
    }
  }

  // === Block Queue ===
  public enqueueBlock(blockType: BlockType): void {
    console.log('[PlayerResources] Queue Size: ', this.blockQueue.length);
    this.blockQueue.push(blockType);
  }

  enqueueBlockToFront(blockType: BlockType): void {
    console.log('[PlayerResources] Queue Size: ', this.blockQueue.length);
    this.blockQueue.unshift(blockType);
  }

  public dequeueBlock(): BlockType | null {
    console.log('[PlayerResources] Queue size: ', this.blockQueue.length);
    return this.blockQueue.shift() ?? null;
  }

  public getBlockQueue(): BlockType[] {
    return this.blockQueue;
  }

  public getBlockCount(): number {
    return this.blockQueue.length;
  }

  public hasBlocks(): boolean {
    return this.blockQueue.length > 0;
  }

  public queueSize(): number {

    return this.blockQueue.length;
  }

  public getLastGatheredBlock(): BlockType | null {
    return this.blockQueue.length > 0 ? this.blockQueue[this.blockQueue.length - 1] : null;
  }

  // === Lifecycle ===
  public reset(): void {
    this.currency = 0;
    this.blockQueue = [];
    this.notifyCurrencyChange();
  }

  public destroy(): void {
    this.currency = 0;
    this.blockQueue = [];
    this.onCurrencyChangeCallbacks.clear();
  }

  public postMissionClear(): void {
    this.blockQueue = [];
    this.onCurrencyChangeCallbacks.clear();
  }
}
