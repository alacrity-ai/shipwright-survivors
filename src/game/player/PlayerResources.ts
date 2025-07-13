// src/game/player/PlayerResources.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';
import type { Ship } from '@/game/ship/Ship';
import { getBlockType } from '@/game/blocks/BlockRegistry';

const MAX_COMBINABLE_TIER = 4; 

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

  public enqueueBlocks(blockTypes: BlockType[]): void {
    this.blockQueue.push(...blockTypes);
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

  // Enqueue Starting Blocks Helper
  public enqueueSkillTreeStartingBlocks(ship: Ship): void {
    const startingBlocks = ship.getSkillEffects().startingBlocks;
    if (!startingBlocks) return;
    const blockTypes = startingBlocks.map((id) => getBlockType(id)!);
    this.enqueueBlocks(blockTypes);
  }

  /* ────────────────────────────────────────────────────────────────────────────
  *  Combine-helper utilities
  * ────────────────────────────────────────────────────────────────────────── */

  /**
   * Returns the greatest number of identical-tier blocks (same metatag & tier)
   * currently present in the queue.  Zero when the queue is empty.
   *
   * Example:
   *   queue = [hull1, hull1, facetplate1, laser2, laser2, laser2]
   *   → getMaxDuplicateTierCount() === 3   (three laser2’s)
   */
  public getMaxDuplicateTierCount(): number {
    if (this.blockQueue.length === 0) return 0;

    const counts = new Map<string, number>();

    for (const blk of this.blockQueue) {
      // Canonical “family@tier” key (first metatag is authoritative)
      const tag   = blk.metatags?.[0] ?? blk.subcategory ?? blk.id;
      const key   = `${tag}@${blk.tier}`;

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    let max = 0;
    for (const n of counts.values()) max = Math.max(max, n);
    return max;
  }

  /**
   * True when the queue contains ≥ 2 blocks of the *same* metatag & tier **and**
   * an upgrade target (tier +1) exists in the registry.  That guarantees that
   * pressing “Combine Blocks” will succeed.
   */
  public canCombineBlocks(): boolean {
    if (this.blockQueue.length < 2) return false;

    const tally = new Map<string, { tier: number; count: number }>();

    for (const blk of this.blockQueue) {
      const tag = blk.metatags?.[0] ?? blk.subcategory ?? blk.id;
      const key = `${tag}@${blk.tier}`;
      const rec = tally.get(key) ?? { tier: blk.tier, count: 0 };
      rec.count += 1;
      tally.set(key, rec);
    }

    for (const [key, { tier, count }] of tally) {
      if (count < 2) continue;                      // need at least two duplicates
      if (tier >= MAX_COMBINABLE_TIER) continue;    // ceiling reached — no merge

      const [tag] = key.split('@');
      const nextTierId = `${tag}${tier + 1}`;
      if (getBlockType(nextTierId)) return true;
    }
    return false;
  }

  /* ────────────────────────────────────────────────────────────────────────────
  *  Combine-all utility
  * ────────────────────────────────────────────────────────────────────────── */

  /**
   * Iteratively merges every pair of identical-tier blocks into the next tier,
   * cascading upward until no further upgrades are possible.
   *
   * Return value: total number of *upgrade operations* performed
   *               (useful for SFX / analytics).  One operation is
   *               “two tier-k → one tier-k+1”.
   *
   * Example flow (facetplate):
   *   [facetplate1, facetplate1, facetplate1, facetplate1]  // 4× tier-1
   *   → 2 × (1→2)                                           // queue now has 2× tier-2
   *   → 1 × (2→3)                                           // queue now has 1× tier-3
   *   = 3 operations returned
   */
  public combineAllPossibleBlocks(): number {
    if (this.blockQueue.length < 2) return 0;

    /* ---------- 1. Bucket counts by (tag, tier) ---------- */
    interface Bucket { tier: number; count: number; }
    const buckets = new Map<string, Bucket>();

    const keyOf = (b: BlockType) =>
      `${b.metatags?.[0] ?? b.subcategory ?? b.id}@${b.tier}`;

    for (const blk of this.blockQueue) {
      const key = keyOf(blk);
      const entry = buckets.get(key) ?? { tier: blk.tier, count: 0 };
      entry.count += 1;
      buckets.set(key, entry);
    }

    /* ---------- 2. Recursively promote blocks (≤ MAX_COMBINABLE_TIER) ---------- */
    let ops = 0;                                       // upgrade operations

    const sorted = [...buckets.entries()].sort(
      ([, a], [, b]) => a.tier - b.tier
    );

    for (const [key, bucket] of sorted) {
      // Skip buckets already at (or above, defensive) the ceiling
      if (bucket.tier >= MAX_COMBINABLE_TIER) continue;

      while (bucket.count >= 2) {
        const nextTier = bucket.tier + 1;

        // Guard: do not promote beyond the ceiling
        if (nextTier > MAX_COMBINABLE_TIER) break;

        const [tag] = key.split('@');
        const nextId = `${tag}${nextTier}`;
        const nextType = getBlockType(nextId);
        if (!nextType) break;                        // no higher block defined

        const pairs = Math.floor(bucket.count / 2);
        bucket.count -= pairs * 2;                   // consume pairs

        const nextKey = `${tag}@${nextTier}`;
        const nextBucket = buckets.get(nextKey) ?? { tier: nextTier, count: 0 };
        nextBucket.count += pairs;
        buckets.set(nextKey, nextBucket);

        ops += pairs;
      }
    }

    if (ops === 0) return 0;                         // nothing changed

    /* ---------- 3. Reconstruct queue ---------- */
    const rebuilt: BlockType[] = [];
    for (const [key, bucket] of buckets) {
      const [tag] = key.split('@');
      const typeIdBase = `${tag}${bucket.tier}`;
      const blkType = getBlockType(typeIdBase);
      if (!blkType) continue;                        // defensive
      for (let i = 0; i < bucket.count; i++) rebuilt.push(blkType);
    }

    this.blockQueue = rebuilt;
    return ops;
  }
}
