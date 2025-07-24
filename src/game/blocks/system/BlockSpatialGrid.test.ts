// src/game/blocks/system/BlockSpatialGrid.test.ts

// npx vitest run src/game/blocks/system/BlockSpatialGrid.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { BlockStore } from '@/game/blocks/system/BlockStore';
import { BlockSpatialGrid } from '@/game/blocks/system/BlockSpatialGrid';

describe('BlockSpatialGrid', () => {
  let store: BlockStore;
  let grid: BlockSpatialGrid;

  beforeEach(() => {
    store = new BlockStore(32);
    grid = new BlockSpatialGrid(store, 10); // 10-unit cells for easy math
  });

  function cellKey(x: number, y: number): number {
    return (x & 0xffff) | ((y & 0xffff) << 16);
  }

  describe('block registration', () => {
    it('registerBlock assigns a block to its correct cell and updates blockToCellKey', () => {
      const idx = store.allocateIndex();
      grid.registerBlock(idx, 15, 25); // Should map to cell (1, 2)
      const expectedKey = cellKey(1, 2);

      // After registration, the block’s cell key should match the packed key (not -1)
      expect((grid as any).blockToCellKey[idx]).toBe(expectedKey);

      const blocks = (grid as any).cells.get(expectedKey);
      const count = (grid as any).cellCounts.get(expectedKey);
      expect(blocks[0]).toBe(idx);
      expect(count).toBe(1);
    });
  });

  describe('rehoming behavior', () => {
    it('rehomeBlockIndex moves block when crossing cells', () => {
      const idx = store.allocateIndex();
      grid.registerBlock(idx, 5, 5); // cell (0, 0)
      const oldKey = (grid as any).blockToCellKey[idx];

      grid.rehomeBlockIndex(idx, 25, 5); // moves to cell (2, 0)
      const newKey = (grid as any).blockToCellKey[idx];
      expect(newKey).not.toBe(oldKey);

      // After rehoming, the old cell’s count should drop to 0
      const oldCount = (grid as any).cellCounts.get(oldKey) ?? 0;
      const newCount = (grid as any).cellCounts.get(newKey) ?? 0;
      expect(oldCount).toBe(0);
      expect(newCount).toBe(1);

      // Also verify the block is no longer mapped to the old cell
      expect((grid as any).blockToCellKey[idx]).toBe(newKey);
    });


    it('rehomeBlockIndex is a no-op if block stays in same cell', () => {
      const idx = store.allocateIndex();
      grid.registerBlock(idx, 12, 12); // cell (1, 1)
      const before = (grid as any).cellCounts.get((grid as any).blockToCellKey[idx]);
      grid.rehomeBlockIndex(idx, 14, 14); // still (1,1)
      const after = (grid as any).cellCounts.get((grid as any).blockToCellKey[idx]);
      expect(after).toBe(before);
    });
  });

  describe('deregistration', () => {
    it('deregisterBlock removes block and clears blockToCellKey', () => {
      const idx = store.allocateIndex();
      grid.registerBlock(idx, 0, 0);
      grid.deregisterBlock(idx);

      // After deregistration, the block should now be marked as unregistered (-1 sentinel)
      expect((grid as any).blockToCellKey[idx]).toBe(-1);

      const key = cellKey(0, 0);
      const count = (grid as any).cellCounts.get(key) ?? 0;
      expect(count).toBe(0);
    });

    it('deregisterBlock is a no-op if called twice', () => {
      const idx = store.allocateIndex();
      grid.registerBlock(idx, 0, 0);
      grid.deregisterBlock(idx);
      // Call again; should not throw
      expect(() => grid.deregisterBlock(idx)).not.toThrow();
    });
  });

  describe('cell growth', () => {
    it('doubles cell capacity until max', () => {
      const idxs: number[] = [];
      const cellKey0 = cellKey(0, 0);
      // Pre-fill a single cell beyond INITIAL_CELL_CAPACITY
      const initCapacity = (BlockSpatialGrid as any).INITIAL_CELL_CAPACITY;
      const maxCapacity = (BlockSpatialGrid as any).MAX_CELL_CAPACITY;

      for (let i = 0; i < initCapacity + 5; i++) {
        const idx = store.allocateIndex();
        idxs.push(idx);
        grid.registerBlock(idx, 1, 1);
      }

      const arr = (grid as any).cells.get(cellKey0);
      expect(arr.length).toBeGreaterThan(initCapacity);
      expect(arr.length).toBeLessThanOrEqual(maxCapacity);
    });

    it('never grows beyond MAX_CELL_CAPACITY', () => {
      const idxs: number[] = [];
      const maxCapacity = (BlockSpatialGrid as any).MAX_CELL_CAPACITY;
      for (let i = 0; i < maxCapacity + 50; i++) {
        const idx = store.allocateIndex();
        idxs.push(idx);
        grid.registerBlock(idx, 2, 2);
      }
      const arr = (grid as any).cells.get(cellKey(0, 0));
      expect(arr.length).toBe(maxCapacity);
    });
  });

  describe('querying', () => {
    it('returns blocks for a single populated cell', () => {
      const a = store.allocateIndex();
      const b = store.allocateIndex();
      grid.registerBlock(a, 5, 5); // cell (0,0)
      grid.registerBlock(b, 6, 6); // same cell
      const results = grid.getBlocksInArea(0, 0, 9, 9);
      expect(Array.from(results).sort()).toEqual([a, b].sort());
    });

    it('returns blocks across multiple adjacent cells', () => {
      const ids: number[] = [];
      for (const [x, y] of [
        [5, 5],   // cell (0,0)
        [15, 5],  // cell (1,0)
        [5, 15],  // cell (0,1)
        [15, 15], // cell (1,1)
      ]) {
        const idx = store.allocateIndex();
        grid.registerBlock(idx, x, y);
        ids.push(idx);
      }
      const results = grid.getBlocksInArea(0, 0, 20, 20);
      expect(new Set(results)).toEqual(new Set(ids));
    });

    it('returns empty array for area with no blocks', () => {
      const results = grid.getBlocksInArea(100, 100, 120, 120);
      expect(results.length).toBe(0);
    });
  });

  describe('clear', () => {
    it('resets all cells, counts, and block mappings', () => {
      const idx = store.allocateIndex();
      grid.registerBlock(idx, 5, 5);
      grid.clear();
      expect((grid as any).cells.size).toBe(0);
      expect((grid as any).cellCounts.size).toBe(0);
      expect(Array.from((grid as any).blockToCellKey)).toEqual(
        Array(store.capacity).fill(-1)
      );
    });
  });
});
