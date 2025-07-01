// src/game/player/PlayerResources.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';

export class PlayerResources {
  private static instance: PlayerResources;

  // private currency: number = 0;
  private blockQueue: BlockType[] = [];
  private maxBlockQueueSize: number = 25;

  private onCurrencyChangeCallbacks: Set<(newValue: number) => void> = new Set();

  private constructor() {}

  public static getInstance(): PlayerResources {
    if (!PlayerResources.instance) {
      PlayerResources.instance = new PlayerResources();
    }
    return PlayerResources.instance;
  }

  public initialize(startingCurrency: number = 0): void {
    // this.currency = startingCurrency;
  }

  // === Block Queue ===
  public getMaxBlockQueueSize(): number {
    return this.maxBlockQueueSize;
  }

  public setMaxBlockQueueSize(size: number): void {
    this.maxBlockQueueSize = size;
  }

  public enqueueBlock(blockType: BlockType): void {
    this.blockQueue.push(blockType);
  }

  public enqueueBlockToFront(blockType: BlockType): void {
    this.blockQueue.unshift(blockType);
  }

  public dequeueBlock(): BlockType | null {
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

  /** Removes a block from the queue at the specified index. Returns true if removed. */
  public removeBlockAt(index: number): boolean {
    if (index < 0 || index >= this.blockQueue.length) return false;
    this.blockQueue.splice(index, 1);
    return true;
  }

  public queueSize(): number {
    return this.blockQueue.length;
  }

  public getLastGatheredBlock(): BlockType | null {
    return this.blockQueue.length > 0 ? this.blockQueue[this.blockQueue.length - 1] : null;
  }

  // === Lifecycle ===
  public reset(): void {
    this.blockQueue = [];
    // this.notifyCurrencyChange(); TODO : Check for consumers awaiting this
  }

  public destroy(): void {
    this.blockQueue = [];
    this.onCurrencyChangeCallbacks.clear();
  }

  public postMissionClear(): void {
    this.blockQueue = [];
    this.onCurrencyChangeCallbacks.clear();
  }
}
