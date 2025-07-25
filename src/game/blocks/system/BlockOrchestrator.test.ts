// src/game/blocks/system/BlockOrchestrator.test.ts

// npx vitest run src/game/blocks/system/BlockOrchestrator.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlockStore } from '@/game/blocks/system/BlockStore';
import { BlockOrchestrator, type BlockSpatialGrid, type BlockRegistry, type BlockEntityTransform } from '@/game/blocks/system/BlockOrchestrator';

describe('BlockOrchestrator', () => {
  let store: BlockStore;
  let grid: BlockSpatialGrid;
  let registry: BlockRegistry;
  let orchestrator: BlockOrchestrator;

  beforeEach(() => {
    store = new BlockStore(64);

    grid = {
      registerBlock: vi.fn(),
      deregisterBlock: vi.fn(),
      rehomeBlockIndex: vi.fn(),
      getBlocksInArea: vi.fn(),
      bulkRemoveBlocks: vi.fn(),
      clear: vi.fn(),
    };

    registry = {
      getBlockType: vi.fn().mockReturnValue({ armor: 250 }),
    };

    orchestrator = new BlockOrchestrator(store, grid, registry);
  });

  function makeTransform(): BlockEntityTransform {
    return {
      position: { x: 100, y: 200 },
      velocity: { x: 0, y: 0 },
      rotation: Math.PI / 2,
    };
  }

  describe('createBlock', () => {
    it('populates BlockStore fields and adds to ship list', () => {
      const idx = orchestrator.createBlock({
        ownerShipId: 1,
        ownerFaction: 2,
        typeIndex: 3,
        localX: 5,
        localY: -2,
        blockTypeId: 'armor-block',
      });

      expect(idx).toBeGreaterThanOrEqual(0);
      expect(store.ownerShipId[idx]).toBe(1);
      expect(store.ownerFaction[idx]).toBe(2);
      expect(store.typeIndex[idx]).toBe(3);
      expect(store.localX[idx]).toBe(5);
      expect(store.localY[idx]).toBe(-2);
      expect(store.hp[idx]).toBe(250); // From registry mock
      expect(orchestrator.getShipBlockCount(1)).toBe(1);
    });

    it('returns -1 if BlockStore is at capacity', () => {
      const smallStore = new BlockStore(1);
      const smallOrch = new BlockOrchestrator(smallStore, grid, registry);

      expect(smallOrch.createBlock({ ownerShipId: 1, ownerFaction: 1, typeIndex: 0, localX: 0, localY: 0 })).not.toBe(-1);
      expect(smallOrch.createBlock({ ownerShipId: 1, ownerFaction: 1, typeIndex: 0, localX: 0, localY: 0 })).toBe(-1);
    });

    it('respects MAX_SHIP_BLOCKS', () => {
      // Create a BlockStore big enough so we only hit the orchestrator's cap, not store capacity
      const bigStore = new BlockStore((BlockOrchestrator as any).MAX_SHIP_BLOCKS + 10);
      const bigOrchestrator = new BlockOrchestrator(bigStore, grid, registry);

      const max = (BlockOrchestrator as any).MAX_SHIP_BLOCKS;
      for (let i = 0; i < max; i++) {
        const idx = bigOrchestrator.createBlock({
          ownerShipId: 99,
          ownerFaction: 1,
          typeIndex: 0,
          localX: 0,
          localY: 0,
        });
        expect(idx).not.toBe(-1);
      }
      const overflow = bigOrchestrator.createBlock({
        ownerShipId: 99,
        ownerFaction: 1,
        typeIndex: 0,
        localX: 0,
        localY: 0,
      });
      expect(overflow).toBe(-1);
    });
  });

  describe('updateWorldPositions', () => {
    it('correctly computes world positions and rotations', () => {
      const idx = orchestrator.createBlock({
        ownerShipId: 5,
        ownerFaction: 1,
        typeIndex: 0,
        localX: 10,
        localY: 0,
      });
      const transform = makeTransform();

      orchestrator.updateWorldPositions(5, transform);

      const x = store.worldX[idx];
      const y = store.worldY[idx];
      const rot = store.rotation[idx];

      // For a PI/2 rotation: localX shifts to +Y relative to ship
      expect(x).toBeCloseTo(100);       // Ship X stays same (localX rotated to Y)
      expect(y).toBeCloseTo(210);       // Ship Y + localX
      expect(rot).toBeCloseTo(transform.rotation);
    });
  });

  describe('ship block management', () => {
    it('ensureShipBlocks initializes arrays', () => {
      const arr = orchestrator.ensureShipBlocks(123);
      expect(arr).toBeInstanceOf(Uint32Array);
      expect(orchestrator.getShipBlockCount(123)).toBe(0);
    });

    it('getShipBlocks and getShipBlocksView reflect actual block count', () => {
      const idx1 = orchestrator.createBlock({ ownerShipId: 7, ownerFaction: 1, typeIndex: 0, localX: 0, localY: 0 });
      const idx2 = orchestrator.createBlock({ ownerShipId: 7, ownerFaction: 1, typeIndex: 0, localX: 0, localY: 0 });

      const blocks = orchestrator.getShipBlocks(7)!;
      expect(blocks.length).toBeGreaterThanOrEqual(2);

      const view = orchestrator.getShipBlocksView(7);
      expect(Array.from(view)).toContain(idx1);
      expect(Array.from(view)).toContain(idx2);
    });
  });

  describe('clearShip', () => {
    it('deregisters and frees all blocks for a ship', () => {
      const idx1 = orchestrator.createBlock({ ownerShipId: 8, ownerFaction: 1, typeIndex: 0, localX: 0, localY: 0 });
      const idx2 = orchestrator.createBlock({ ownerShipId: 8, ownerFaction: 1, typeIndex: 0, localX: 0, localY: 0 });
      expect(orchestrator.getShipBlockCount(8)).toBe(2);

      orchestrator.clearShip(8);

      expect(orchestrator.getShipBlockCount(8)).toBe(0);
      expect(store.isAllocated(idx1)).toBe(false);
      expect(store.isAllocated(idx2)).toBe(false);
      expect(grid.deregisterBlock).toHaveBeenCalledTimes(2);

      // Freed indices should be reusable
      const newIdx = orchestrator.createBlock({ ownerShipId: 8, ownerFaction: 1, typeIndex: 0, localX: 0, localY: 0 });
      expect(newIdx).toBe(idx2); // Recycled index
    });
  });

  describe('destroyBlock', () => {
    it('removes from ship, deregisters from grid, frees index', () => {
      const idx = orchestrator.createBlock({ ownerShipId: 3, ownerFaction: 1, typeIndex: 0, localX: 0, localY: 0 });
      orchestrator.destroyBlock(idx);

      expect(store.isAllocated(idx)).toBe(false);
      expect(orchestrator.getShipBlockCount(3)).toBe(0);
      expect(grid.deregisterBlock).toHaveBeenCalledWith(idx);
    });
  });

  describe('spatial grid integration', () => {
    it('syncSpatialGrid calls rehomeBlockIndex for all ship blocks', () => {
      const idx1 = orchestrator.createBlock({ ownerShipId: 4, ownerFaction: 1, typeIndex: 0, localX: 0, localY: 0 });
      const idx2 = orchestrator.createBlock({ ownerShipId: 4, ownerFaction: 1, typeIndex: 0, localX: 0, localY: 0 });
      store.worldX[idx1] = 50; store.worldY[idx1] = 60;
      store.worldX[idx2] = 10; store.worldY[idx2] = 20;

      orchestrator.syncSpatialGrid(4);
      expect(grid.rehomeBlockIndex).toHaveBeenCalledWith(idx1, 50, 60);
      expect(grid.rehomeBlockIndex).toHaveBeenCalledWith(idx2, 10, 20);
    });

    it('createAndRegisterBlock registers with grid immediately', () => {
      const transform = makeTransform();
      const idx = orchestrator.createAndRegisterBlock({ ownerShipId: 1, ownerFaction: 1, typeIndex: 0, localX: 5, localY: 5 }, transform);
      expect(grid.registerBlock).toHaveBeenCalledWith(idx, store.worldX[idx], store.worldY[idx]);
    });
  });

  describe('getBlockInstanceView', () => {
    it('returns a snapshot of block fields', () => {
      const idx = orchestrator.createBlock({ ownerShipId: 1, ownerFaction: 2, typeIndex: 3, localX: 4, localY: -4 });
      store.hp[idx] = 42;
      const view = orchestrator.getBlockInstanceView(idx)!;

      expect(view.hp).toBe(42);
      expect(view.ownerShipId).toBe(1);
      expect(view.position.localX).toBe(4);
      expect(view.position.worldX).toBe(store.worldX[idx]);
    });

    it('returns null for invalid or freed indices', () => {
      expect(orchestrator.getBlockInstanceView(-1)).toBeNull();
      const idx = orchestrator.createBlock({ ownerShipId: 1, ownerFaction: 1, typeIndex: 0, localX: 0, localY: 0 });
      orchestrator.destroyBlock(idx);
      expect(orchestrator.getBlockInstanceView(idx)).toBeNull();
    });
  });
});
