// src/game/blocks/system/BlockSpatialGrid.ts

import { BlockStore } from '@/game/blocks/system/BlockStore';

/**
 * A lightweight, SOA-native spatial grid for block broad-phase queries.
 * 
 * - Stores **block indices** directly (no BlockInstance).
 * - Uses fixed-size cells (gridCellSize) for fast partitioning.
 * - Maintains reverse mapping (blockIndex → cell key) for efficient rehoming.
 * - Allocation-free queries: consumers receive subarrays or shared buffers.
 */
export class BlockSpatialGrid {
  private readonly gridCellSize: number;
  private readonly cells: Map<number, Uint32Array>;
  private readonly cellCounts: Map<number, number>;
  private readonly blockToCellKey: Int32Array;

  // Default per-cell allocation size; grows dynamically when needed.
  private static readonly INITIAL_CELL_CAPACITY = 64;
  private static readonly MAX_CELL_CAPACITY = 4096;

  private static readonly SCRATCH = new Uint32Array(4096);
  private scratchCount: number = 0;

  constructor(
    private readonly store: BlockStore,
    gridCellSize: number = 128
  ) {
    this.gridCellSize = gridCellSize;
    this.cells = new Map();
    this.cellCounts = new Map();

    // Reverse lookup: which cell a block is currently in (0 if none).
    this.blockToCellKey = new Int32Array(store.capacity);
    this.blockToCellKey.fill(-1);
  }

  /**
   * Registers a block into the spatial grid based on its current world position.
   * @param index Block index
   * @param worldX World-space X position
   * @param worldY World-space Y position
   */
  registerBlock(index: number, worldX: number, worldY: number): void {
    const cellKey = this.computeCellKey(worldX, worldY);
    this.addToCell(cellKey, index);
    this.blockToCellKey[index] = cellKey;
  }

  /**
   * Deregisters a block from its current cell.
   * @param index Block index
   */
  deregisterBlock(index: number): void {
    const cellKey = this.blockToCellKey[index];
    if (cellKey === -1) return; // Not registered
    this.removeFromCell(cellKey, index);
    this.blockToCellKey[index] = -1;
  }

  /** Returns true if the block is registered in the grid. */
  public isRegistered(index: number): boolean {
    return this.blockToCellKey[index] !== -1;
  }

  /**
   * Rehomes a block: efficiently moves it to the correct cell if it changed.
   * @param index Block index
   * @param worldX World-space X position
   * @param worldY World-space Y position
   */
  rehomeBlockIndex(index: number, worldX: number, worldY: number): void {
    const newCellKey = this.computeCellKey(worldX, worldY);
    const oldCellKey = this.blockToCellKey[index];
    if (newCellKey === oldCellKey) return;

    if (oldCellKey !== -1) {
      this.removeFromCell(oldCellKey, index);
    }
    this.addToCell(newCellKey, index);
    this.blockToCellKey[index] = newCellKey;
  }

  getCellSize(): number {
    return this.gridCellSize;
  }

  /**
   * Queries all blocks overlapping a rectangular region.
   * Returns a view into a static scratch buffer (no allocations).
   * @param minX Left bound
   * @param minY Top bound
   * @param maxX Right bound
   * @param maxY Bottom bound
   */
  getBlocksInArea(minX: number, minY: number, maxX: number, maxY: number): Uint32Array {
    const minCellX = Math.floor(minX / this.gridCellSize);
    const minCellY = Math.floor(minY / this.gridCellSize);

    // Use floor, not ceil-minus-one, to ensure we include the last touched cell
    const maxCellX = Math.floor((maxX - 1e-6) / this.gridCellSize);
    const maxCellY = Math.floor((maxY - 1e-6) / this.gridCellSize);

    this.scratchCount = 0;

    for (let cy = minCellY; cy <= maxCellY; cy++) {
      for (let cx = minCellX; cx <= maxCellX; cx++) {
        const cellKey = this.packCellKey(cx, cy);
        const blocks = this.cells.get(cellKey);
        const count = this.cellCounts.get(cellKey) ?? 0;
        if (!blocks || count === 0) continue;

        for (let i = 0; i < count; i++) {
          BlockSpatialGrid.SCRATCH[this.scratchCount++] = blocks[i];
        }
      }
    }

    return BlockSpatialGrid.SCRATCH.subarray(0, this.scratchCount);
  }

  /**
   * Returns a subarray of block indices in the specified cell,
   * optionally excluding blocks of a given faction.
   * Allocation-free: returns a view into the static scratch buffer.
   *
   * @param cellX Grid cell X (in world cell coordinates, not pixels)
   * @param cellY Grid cell Y (in world cell coordinates, not pixels)
   * @param excludeFaction Optional numeric faction index to exclude
   */
  public getBlocksInCellFiltered(cellX: number, cellY: number, excludeFaction?: number): Uint32Array {
    const cellKey = this.packCellKey(cellX, cellY);
    const blocks = this.cells.get(cellKey);
    const count = this.cellCounts.get(cellKey) ?? 0;

    this.scratchCount = 0;

    if (!blocks || count === 0) {
      return BlockSpatialGrid.SCRATCH.subarray(0, 0); // Empty view
    }

    const s = this.store;
    for (let i = 0; i < count; i++) {
      const idx = blocks[i];
      if (excludeFaction === undefined || s.ownerFaction[idx] !== excludeFaction) {
        BlockSpatialGrid.SCRATCH[this.scratchCount++] = idx;
      }
    }

    return BlockSpatialGrid.SCRATCH.subarray(0, this.scratchCount);
  }

  /**
   * Helper to add a block to a cell, growing the cell’s buffer if necessary.
   */
  private addToCell(cellKey: number, index: number): void {
    let blocks = this.cells.get(cellKey);
    let count = this.cellCounts.get(cellKey) ?? 0;

    if (!blocks) {
      blocks = new Uint32Array(BlockSpatialGrid.INITIAL_CELL_CAPACITY);
      this.cells.set(cellKey, blocks);
      count = 0;
    } else if (count >= blocks.length) {
      // Grow array by doubling, up to MAX_CELL_CAPACITY
      const newCapacity = Math.min(blocks.length * 2, BlockSpatialGrid.MAX_CELL_CAPACITY);
      const newBlocks = new Uint32Array(newCapacity);
      newBlocks.set(blocks);
      blocks = newBlocks;
      this.cells.set(cellKey, blocks);
    }

    blocks[count] = index;
    this.cellCounts.set(cellKey, count + 1);
  }

  /**
   * Helper to remove a block from a cell via swap-with-last.
   * Ensures the last slot is cleared to avoid stale indices.
   */
  private removeFromCell(cellKey: number, index: number): void {
    const blocks = this.cells.get(cellKey);
    const count = this.cellCounts.get(cellKey) ?? 0;
    if (!blocks || count === 0) return;

    let found = -1;
    for (let i = 0; i < count; i++) {
      if (blocks[i] === index) {
        found = i;
        break;
      }
    }
    if (found === -1) return;

    const last = count - 1;
    if (found !== last) {
      blocks[found] = blocks[last];
    }

    // Clear the last slot to prevent stale data
    blocks[last] = 0;

    this.cellCounts.set(cellKey, last);
  }

  /**
   * Removes multiple blocks from a single grid cell in bulk.
   * Filters the cell array in-place, preserving surviving entries.
   * Assumes `toRemove` only contains indices present in this cell.
   *
   * @param cellKey Cell key whose contents should be filtered
   * @param toRemove Contiguous list of block indices to remove (cell-specific)
   * @param removeCount Number of valid entries in `toRemove`
   */
  public bulkRemoveBlocks(cellKey: number, toRemove: Uint32Array, removeCount: number): void {
    const blocks = this.cells.get(cellKey);
    const count = this.cellCounts.get(cellKey) ?? 0;
    if (!blocks || count === 0 || removeCount === 0) return;

    const blockToCellKey = this.blockToCellKey;

    let write = 0;
    outer: for (let i = 0; i < count; i++) {
      const idx = blocks[i];

      // Skip any blocks scheduled for removal
      for (let r = 0; r < removeCount; r++) {
        if (toRemove[r] === idx) {
          blockToCellKey[idx] = -1; // explicitly mark as unregistered
          continue outer;
        }
      }

      // Keep this block
      blocks[write++] = idx;

      // Ensure its reverse mapping still points to this cell
      blockToCellKey[idx] = cellKey;
    }

    // Clear out trailing slots to avoid stale indices
    for (let i = write; i < count; i++) {
      blocks[i] = 0;
    }

    this.cellCounts.set(cellKey, write);
  }

  /**
   * Computes the spatial grid cell key from world coordinates.
   */
  private computeCellKey(worldX: number, worldY: number): number {
    const cellX = Math.floor(worldX / this.gridCellSize);
    const cellY = Math.floor(worldY / this.gridCellSize);
    return this.packCellKey(cellX, cellY);
  }

  /**
   * Packs cell coordinates into a 32-bit key, preserving sign.
   * Supports world extents [-32768, 32767] cells per axis, which
   * covers your map (even at 500px per cell, that's ~32M world units).
   */
  private packCellKey(cellX: number, cellY: number): number {
    const bx = cellX + 32768; // bias to avoid negative wrap
    const by = cellY + 32768;
    return (bx & 0xFFFF) | ((by & 0xFFFF) << 16);
  }

  /**
   * Clears the grid of all blocks.
   */
  clear(): void {
    this.cells.clear();
    this.cellCounts.clear();
    this.blockToCellKey.fill(-1);
  }
}
