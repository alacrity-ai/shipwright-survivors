// src/game/blocks/system/BlockStore.test.ts

// npx vitest run src/game/blocks/system/BlockStore.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { BlockStore } from '@/game/blocks/system/BlockStore';

describe('BlockStore', () => {
  let store: BlockStore;

  beforeEach(() => {
    store = new BlockStore(8);
  });

  describe('constructor', () => {
    it('initializes all arrays to the given capacity', () => {
      expect(store.capacity).toBe(8);
      expect(store.localX.length).toBe(8);
      expect(store.hp.length).toBe(8);
      expect(store.shieldSourceId.length).toBe(8);
    });

    it('fills shieldSourceId with -1 by default', () => {
      for (let i = 0; i < store.capacity; i++) {
        expect(store.shieldSourceId[i]).toBe(-1);
      }
    });

    it('throws if constructed with invalid capacity', () => {
      expect(() => new BlockStore(0)).toThrow();
      expect(() => new BlockStore(-5)).toThrow();
      expect(() => new BlockStore(3.5 as any)).toThrow();
    });
  });

  describe('allocateIndex', () => {
    it('allocates sequential indices until capacity is reached', () => {
      const ids = Array.from({ length: store.capacity }, () => store.allocateIndex());
      expect(ids).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(store.allocateIndex()).toBe(-1); // exceeds capacity
    });

    it('reuses freed indices from freeList in LIFO order', () => {
      const a = store.allocateIndex(); // 0
      const b = store.allocateIndex(); // 1
      store.freeIndex(a);
      const c = store.allocateIndex(); // should reuse 0
      expect(c).toBe(a);
      store.freeIndex(b);
      const d = store.allocateIndex(); // should reuse 1
      expect(d).toBe(b);
    });

    it('marks allocated indices as active', () => {
      const idx = store.allocateIndex();
      expect(store.isAllocated(idx)).toBe(true);
    });
  });

  describe('freeIndex', () => {
    it('clears all fields and recycles the index', () => {
      const idx = store.allocateIndex();

      // Set some fields to non-zero values
      store.localX[idx] = 5;
      store.hp[idx] = 10;
      store.ownerShipId[idx] = 42;
      store.shieldSourceId[idx] = 99;

      store.freeIndex(idx);

      // All fields zeroed (or -1 for shieldSourceId)
      expect(store.localX[idx]).toBe(0);
      expect(store.hp[idx]).toBe(0);
      expect(store.ownerShipId[idx]).toBe(0);
      expect(store.shieldSourceId[idx]).toBe(-1);
      expect(store.isAllocated(idx)).toBe(false);
    });

    it('throws when freeing out-of-range indices', () => {
      expect(() => store.freeIndex(-1)).toThrow();
      expect(() => store.freeIndex(store.capacity)).toThrow();
    });
  });

  describe('clear', () => {
    it('resets all data and counters', () => {
      const idx1 = store.allocateIndex();
      const idx2 = store.allocateIndex();
      store.hp[idx1] = 99;
      store.hp[idx2] = 50;

      store.clear();

      expect(store.count).toBe(0);
      expect(store.isAllocated(idx1)).toBe(false);
      expect(store.hp[idx1]).toBe(0);
      expect(store.hp[idx2]).toBe(0);
      expect(store.shieldSourceId[idx1]).toBe(-1);
      expect(store.shieldSourceId[idx2]).toBe(-1);
    });
  });

  describe('isAllocated', () => {
    it('returns true only for allocated indices', () => {
      const idx = store.allocateIndex();
      expect(store.isAllocated(idx)).toBe(true);
      store.freeIndex(idx);
      expect(store.isAllocated(idx)).toBe(false);
    });

    it('returns false for out-of-range indices', () => {
      expect(store.isAllocated(-1)).toBe(false);
      expect(store.isAllocated(store.capacity)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles capacity = 1 correctly', () => {
      const singleStore = new BlockStore(1);
      const idx = singleStore.allocateIndex();
      expect(idx).toBe(0);
      expect(singleStore.allocateIndex()).toBe(-1);
      singleStore.freeIndex(idx);
      expect(singleStore.allocateIndex()).toBe(0);
    });
  });

  describe('stress tests', () => {
    it('can allocate and free thousands of blocks repeatedly without leaks', () => {
      const bigStore = new BlockStore(5000);

      for (let cycle = 0; cycle < 50; cycle++) {
        const allocated: number[] = [];
        for (let i = 0; i < bigStore.capacity; i++) {
          const idx = bigStore.allocateIndex();
          allocated.push(idx);
          bigStore.hp[idx] = i;
        }

        expect(bigStore.allocateIndex()).toBe(-1);

        for (const idx of allocated) {
          bigStore.freeIndex(idx);
        }

        // Sample only a few indices to validate resets
        for (let j = 0; j < 50; j++) {
          const idx = Math.floor(Math.random() * bigStore.capacity);
          expect(bigStore.hp[idx]).toBe(0);
          expect(bigStore.shieldSourceId[idx]).toBe(-1);
          expect(bigStore.isAllocated(idx)).toBe(false);
        }
      }
    });

    it('maintains correct allocation order and no stale references under heavy churn', () => {
      const churnStore = new BlockStore(2000);
      const allocated: number[] = [];

      // Allocate half, free some, reallocate in cycles
      for (let cycle = 0; cycle < 100; cycle++) {
        while (allocated.length < 1000) {
          const idx = churnStore.allocateIndex();
          expect(idx).not.toBe(-1);
          allocated.push(idx);
          churnStore.hp[idx] = cycle;
        }
        // Free 250 random indices
        for (let i = 0; i < 250; i++) {
          const idx = allocated.pop()!;
          churnStore.freeIndex(idx);
          expect(churnStore.hp[idx]).toBe(0);
          expect(churnStore.isAllocated(idx)).toBe(false);
        }
      }

      // After churn, ensure no index is allocated beyond capacity
      expect(allocated.every((idx) => idx < churnStore.capacity)).toBe(true);
    });
  });
});
