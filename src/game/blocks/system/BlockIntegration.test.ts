// src/game/blocks/system/BlockIntegration.test.ts

// npx vitest run src/game/blocks/system/BlockIntegration.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { BlockStore } from '@/game/blocks/system/BlockStore';
import { BlockOrchestrator, type BlockEntityTransform } from '@/game/blocks/system/BlockOrchestrator';
import { BlockSpatialGrid } from '@/game/blocks/system/BlockSpatialGrid';
import * as BlockRegistryModule from '@/game/blocks/BlockRegistry';

describe('Ship Construction Integration', () => {
  let store: BlockStore;
  let grid: BlockSpatialGrid;
  let orchestrator: BlockOrchestrator;

  beforeEach(() => {
    store = new BlockStore(128);
    grid = new BlockSpatialGrid(store, 64); // Use the real grid
    orchestrator = new BlockOrchestrator(store, grid, BlockRegistryModule);
  });

  function makeTransform(): BlockEntityTransform {
    return {
      position: { x: 100, y: 50 },
      velocity: { x: 0, y: 0 },
      rotation: Math.PI / 4, // 45 degrees
    };
  }

  it('creates a ship with 10 blocks and registers everything', () => {
    const shipId = 77;
    const blockType = 'hull2'; // armor: 75 per BlockRegistry
    const createdIndices: number[] = [];

    // Lay out 10 blocks in a line along +X local axis
    for (let i = 0; i < 10; i++) {
      const idx = orchestrator.createAndRegisterBlock({
        ownerShipId: shipId,
        ownerFaction: 1,
        typeIndex: 0,
        localX: i * 5,
        localY: 0,
        blockTypeId: blockType,
      }, makeTransform());
      createdIndices.push(idx);
      expect(idx).not.toBe(-1);
    }

    // Verify each block got initial HP from BlockRegistry
    for (const idx of createdIndices) {
      expect(store.hp[idx]).toBe(75);
      expect(grid.isRegistered(idx)).toBe(true);
    }

    // Update world positions and verify expected transforms
    orchestrator.updateShipBlocks(shipId, makeTransform());
    const cos = Math.cos(Math.PI / 4);
    const sin = Math.sin(Math.PI / 4);
    const shipX = 100, shipY = 50;
    const indices = orchestrator.getShipBlocksView(shipId);
    expect(indices.length).toBe(10);

    indices.forEach((idx, i) => {
      const lx = i * 5, ly = 0;
      const expectedX = shipX + lx * cos - ly * sin;
      const expectedY = shipY + lx * sin + ly * cos;
      expect(store.worldX[idx]).toBeCloseTo(expectedX);
      expect(store.worldY[idx]).toBeCloseTo(expectedY);
      // Rotation composed of ship rotation and local (0)
      expect(store.rotation[idx]).toBeCloseTo(Math.PI / 4);
    });
  });

  it('handles BlockStore capacity limits without leaks or instability', () => {
    const shipId = 88;
    const capacity = store.capacity;
    const indices: number[] = [];

    // Allocate up to capacity
    for (let i = 0; i < capacity; i++) {
      const idx = orchestrator.createBlock({
        ownerShipId: shipId,
        ownerFaction: 1,
        typeIndex: 0,
        localX: i,
        localY: 0,
        blockTypeId: 'hull0', // armor 15
      });
      expect(idx).not.toBe(-1);
      indices.push(idx);
    }

    // Next allocation should fail because capacity reached
    const overflow = orchestrator.createBlock({
      ownerShipId: shipId,
      ownerFaction: 1,
      typeIndex: 0,
      localX: 0,
      localY: 0,
      blockTypeId: 'hull0',
    });
    expect(overflow).toBe(-1);

    // Free half the blocks
    for (let i = 0; i < capacity / 2; i++) {
      orchestrator.destroyBlock(indices[i]);
    }

    // Verify all freed indices are unallocated
    for (let i = 0; i < capacity / 2; i++) {
      expect(store.isAllocated(indices[i])).toBe(false);
    }

    // Now reallocate to confirm indices get recycled and are usable
    for (let i = 0; i < capacity / 2; i++) {
      const recycled = orchestrator.createBlock({
        ownerShipId: shipId,
        ownerFaction: 1,
        typeIndex: 0,
        localX: i,
        localY: 0,
        blockTypeId: 'hull1',
      });
      expect(recycled).not.toBe(-1);
      // Freed slots are expected to be reused (LIFO order from freeList)
      expect(store.isAllocated(recycled)).toBe(true);
    }

    // Ensure performance isn’t degraded: update near capacity should be safe
    const transform = makeTransform();
    expect(() => orchestrator.updateShipBlocks(shipId, transform)).not.toThrow();
  });

  it('removes ships cleanly, recycling freed indices and clearing grid membership', () => {
    const shipA = 101;
    const shipB = 202;
    const blockType = 'hull1'; // armor 35 per BlockRegistry
    const createdA: number[] = [];
    const createdB: number[] = [];

    // Create 5 blocks for Ship A and 5 for Ship B
    for (let i = 0; i < 5; i++) {
      createdA.push(orchestrator.createAndRegisterBlock({
        ownerShipId: shipA,
        ownerFaction: 1,
        typeIndex: 0,
        localX: i,
        localY: 0,
        blockTypeId: blockType,
      }, makeTransform()));

      createdB.push(orchestrator.createAndRegisterBlock({
        ownerShipId: shipB,
        ownerFaction: 2,
        typeIndex: 0,
        localX: i * 2,
        localY: 0,
        blockTypeId: blockType,
      }, makeTransform()));
    }

    // Verify all created indices are allocated and registered
    [...createdA, ...createdB].forEach(idx => {
      expect(store.isAllocated(idx)).toBe(true);
      expect(grid.isRegistered(idx)).toBe(true);
    });

    // Clear Ship A entirely
    orchestrator.clearShip(shipA);

    // Ship A’s blocks should now be deallocated and removed from grid
    createdA.forEach(idx => {
      expect(store.isAllocated(idx)).toBe(false);
      // Freed blocks must be removed from grid membership
      expect(grid.isRegistered(idx)).toBe(false);
    });

    // Ship B’s blocks remain unaffected
    createdB.forEach(idx => {
      expect(store.isAllocated(idx)).toBe(true);
      expect(grid.isRegistered(idx)).toBe(true);
    });

    // Reallocate new blocks for a new ship (Ship C) — should reuse freed indices
    const shipC = 303;
    const recycled: number[] = [];
    for (let i = 0; i < createdA.length; i++) {
      const idx = orchestrator.createAndRegisterBlock({
        ownerShipId: shipC,
        ownerFaction: 3,
        typeIndex: 1,
        localX: i * 3,
        localY: 0,
        blockTypeId: blockType,
      }, makeTransform());
      expect(idx).not.toBe(-1);
      recycled.push(idx);
    }

    // Freed slots should be reused (at least some indices match Ship A’s old ones)
    expect(recycled.some(idx => createdA.includes(idx))).toBe(true);
  });

  it('reuses indices after dynamic block destruction and maintains accurate shipBlocksView()', () => {
    const shipId = 404;
    const blockType = 'hull0'; // armor 15
    const initialIndices: number[] = [];

    // Add 100 blocks to the ship
    for (let i = 0; i < 100; i++) {
      const idx = orchestrator.createAndRegisterBlock({
        ownerShipId: shipId,
        ownerFaction: 1,
        typeIndex: 0,
        localX: i,
        localY: 0,
        blockTypeId: blockType,
      }, makeTransform());
      expect(idx).not.toBe(-1);
      initialIndices.push(idx);
    }

    // Destroy half (first 50 blocks)
    const destroyed = initialIndices.slice(0, 50);
    destroyed.forEach(idx => orchestrator.destroyBlock(idx));

    // Verify destroyed indices are freed
    destroyed.forEach(idx => {
      expect(store.isAllocated(idx)).toBe(false);
    });

    // Add 50 new blocks — should reuse freed indices via BlockStore’s free list
    const newIndices: number[] = [];
    for (let i = 0; i < 50; i++) {
      const idx = orchestrator.createAndRegisterBlock({
        ownerShipId: shipId,
        ownerFaction: 1,
        typeIndex: 1,
        localX: i * 2,
        localY: 1,
        blockTypeId: blockType,
      }, makeTransform());
      expect(idx).not.toBe(-1);
      newIndices.push(idx);
    }

    // At least some of the new indices should match the freed ones (recycling)
    expect(newIndices.some(idx => destroyed.includes(idx))).toBe(true);

    // shipBlocksView should now reflect 100 total blocks (50 surviving + 50 new)
    const view = orchestrator.getShipBlocksView(shipId);
    expect(view.length).toBe(100);

    // Ensure all indices in view are allocated and unique
    const uniqueSet = new Set(view);
    expect(uniqueSet.size).toBe(100);
    for (const idx of view) {
      expect(store.isAllocated(idx)).toBe(true);
    }
  });

  it('rehomes blocks correctly as ship moves and yields correct results via getBlocksInArea()', () => {
    const shipId = 505;
    const blockType = 'hull2'; // armor 75
    const created: number[] = [];

    // Spawn a small cluster (5x5 grid of blocks) for the ship
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const idx = orchestrator.createAndRegisterBlock({
          ownerShipId: shipId,
          ownerFaction: 1,
          typeIndex: 0,
          localX: x * 8,
          localY: y * 8,
          blockTypeId: blockType,
        }, makeTransform());
        expect(idx).not.toBe(-1);
        created.push(idx);
      }
    }

    // Initial query around the ship’s starting position
    let areaBlocks = (orchestrator.spatialGrid as any).getBlocksInArea(80, 40, 140, 100);
    expect(areaBlocks.length).toBe(created.length);

    // Move ship 100 units along +X and update
    const movedTransform = {
      position: { x: 200, y: 50 },
      velocity: { x: 0, y: 0 },
      rotation: 0,
    };
    orchestrator.updateShipBlocks(shipId, movedTransform);

    // Query an area overlapping the ship’s new bounds
    const minX = 180, minY = 30, maxX = 240, maxY = 70;
    areaBlocks = (orchestrator.spatialGrid as any).getBlocksInArea(minX, minY, maxX, maxY);

    // Expect all ship blocks to be present (25 blocks total)
    expect(areaBlocks.length).toBe(created.length);

    // Ensure there are no duplicates in the query result
    const unique = new Set(areaBlocks);
    expect(unique.size).toBe(areaBlocks.length);

    // Check that no old cells still contain the moved blocks
    // (by comparing blockToCellKey with current computed keys)
    const grid = orchestrator.spatialGrid as any;
    for (const idx of created) {
      const key = grid.blockToCellKey[idx];
      const cellKey = grid.computeCellKey(store.worldX[idx], store.worldY[idx]);
      expect(key).toBe(cellKey);
    }
  });

  it('handles overlapping ships and grid cleanup when one ship is destroyed', () => {
    const ship1 = 111;
    const ship2 = 222;
    const blockType = 'hull1'; // armor 35 per BlockRegistry
    const created1: number[] = [];
    const created2: number[] = [];

    // Spawn 5 blocks for Ship 1 near (100, 100)
    for (let i = 0; i < 5; i++) {
      const idx = orchestrator.createAndRegisterBlock({
        ownerShipId: ship1,
        ownerFaction: 1,
        typeIndex: 0,
        localX: i * 4,
        localY: 0,
        blockTypeId: blockType,
      }, {
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        rotation: 0,
      });
      expect(idx).not.toBe(-1);
      created1.push(idx);
    }

    // Spawn 5 blocks for Ship 2 overlapping near (110, 100)
    for (let i = 0; i < 5; i++) {
      const idx = orchestrator.createAndRegisterBlock({
        ownerShipId: ship2,
        ownerFaction: 2,
        typeIndex: 0,
        localX: i * 4,
        localY: 0,
        blockTypeId: blockType,
      }, {
        position: { x: 110, y: 100 },
        velocity: { x: 0, y: 0 },
        rotation: 0,
      });
      expect(idx).not.toBe(-1);
      created2.push(idx);
    }

    // Query overlapping region that contains both ships
    let areaBlocks = orchestrator.spatialGrid.getBlocksInArea(90, 80, 140, 120);
    const setBefore = new Set(areaBlocks);
    expect(setBefore.size).toBe(created1.length + created2.length);
    created1.forEach(idx => expect(setBefore.has(idx)).toBe(true));
    created2.forEach(idx => expect(setBefore.has(idx)).toBe(true));

    // Destroy Ship 1 completely
    orchestrator.clearShip(ship1);

    // Ship 1’s blocks should be freed and unregistered
    created1.forEach(idx => {
      expect(store.isAllocated(idx)).toBe(false);
      expect((orchestrator.spatialGrid as any).blockToCellKey[idx]).toBe(-1);
    });

    // Query again — should only return Ship 2’s blocks
    areaBlocks = orchestrator.spatialGrid.getBlocksInArea(90, 80, 140, 120);
    const setAfter = new Set(areaBlocks);
    created2.forEach(idx => {
      expect(store.isAllocated(idx)).toBe(true);
      expect(setAfter.has(idx)).toBe(true);
    });
    created1.forEach(idx => expect(setAfter.has(idx)).toBe(false));

    // Confirm Ship 2 is unaffected
    expect(setAfter.size).toBe(created2.length);
  });

  it('applies rotations and translations correctly to compute world positions', () => {
    const shipId = 606;
    const blockType = 'hull0'; // armor 15
    const indices: number[] = [];

    // Place 4 blocks in a cross shape around local origin
    const localOffsets = [
      { x: -10, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: -10 },
      { x: 0, y: 10 },
    ];

    for (const { x, y } of localOffsets) {
      const idx = orchestrator.createAndRegisterBlock({
        ownerShipId: shipId,
        ownerFaction: 1,
        typeIndex: 0,
        localX: x,
        localY: y,
        blockTypeId: blockType,
      }, {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        rotation: 0,
      });
      expect(idx).not.toBe(-1);
      indices.push(idx);
    }

    // Apply first transform: translate to (100, 50), rotate 90° (π/2)
    const transform1 = {
      position: { x: 100, y: 50 },
      velocity: { x: 0, y: 0 },
      rotation: Math.PI / 2,
    };
    orchestrator.updateShipBlocks(shipId, transform1);

    // Expected positions after a 90° rotation:
    // (x, y) becomes (-y, x) relative to origin, then translated
    const cos90 = Math.cos(Math.PI / 2);
    const sin90 = Math.sin(Math.PI / 2);
    indices.forEach((idx, i) => {
      const lx = localOffsets[i].x;
      const ly = localOffsets[i].y;
      const expectedX = transform1.position.x + lx * cos90 - ly * sin90;
      const expectedY = transform1.position.y + lx * sin90 + ly * cos90;
      expect(store.worldX[idx]).toBeCloseTo(expectedX);
      expect(store.worldY[idx]).toBeCloseTo(expectedY);
      expect(store.rotation[idx]).toBeCloseTo(Math.PI / 2);
    });

    // Apply a second transform: translate to (50, -50), rotate 45° (π/4)
    const transform2 = {
      position: { x: 50, y: -50 },
      velocity: { x: 0, y: 0 },
      rotation: Math.PI / 4,
    };
    orchestrator.updateShipBlocks(shipId, transform2);

    // Check positions for 45° rotation around new center
    const cos45 = Math.cos(Math.PI / 4);
    const sin45 = Math.sin(Math.PI / 4);
    indices.forEach((idx, i) => {
      const lx = localOffsets[i].x;
      const ly = localOffsets[i].y;
      const expectedX = transform2.position.x + lx * cos45 - ly * sin45;
      const expectedY = transform2.position.y + lx * sin45 + ly * cos45;
      expect(store.worldX[idx]).toBeCloseTo(expectedX);
      expect(store.worldY[idx]).toBeCloseTo(expectedY);
      expect(store.rotation[idx]).toBeCloseTo(Math.PI / 4);
    });
  });
});
