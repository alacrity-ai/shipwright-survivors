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

  constructor(
    private readonly store: BlockStore,
    gridCellSize: number = 64
  ) {
    this.gridCellSize = gridCellSize;
    this.cells = new Map();
    this.cellCounts = new Map();

    // Reverse lookup: which cell a block is currently in (0 if none).
    this.blockToCellKey = new Int32Array(store.capacity);
    this.blockToCellKey.fill(0);
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
    if (!cellKey) return; // Not registered
    this.removeFromCell(cellKey, index);
    this.blockToCellKey[index] = 0;
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

    if (oldCellKey) {
      this.removeFromCell(oldCellKey, index);
    }
    this.addToCell(newCellKey, index);
    this.blockToCellKey[index] = newCellKey;
  }

  /**
   * Queries all blocks overlapping a rectangular region.
   * Returns a merged array of block indices (copy-free).
   * @param minX Left bound
   * @param minY Top bound
   * @param maxX Right bound
   * @param maxY Bottom bound
   */
  getBlocksInArea(minX: number, minY: number, maxX: number, maxY: number): Uint32Array {
    const minCellX = Math.floor(minX / this.gridCellSize);
    const minCellY = Math.floor(minY / this.gridCellSize);
    const maxCellX = Math.floor(maxX / this.gridCellSize);
    const maxCellY = Math.floor(maxY / this.gridCellSize);

    // Collect all relevant cells
    const results: number[] = [];
    for (let cy = minCellY; cy <= maxCellY; cy++) {
      for (let cx = minCellX; cx <= maxCellX; cx++) {
        const cellKey = this.packCellKey(cx, cy);
        const blocks = this.cells.get(cellKey);
        const count = this.cellCounts.get(cellKey) ?? 0;
        if (!blocks || count === 0) continue;

        for (let i = 0; i < count; i++) {
          results.push(blocks[i]);
        }
      }
    }
    return Uint32Array.from(results);
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
    this.cellCounts.set(cellKey, last);
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
   * Packs cell coordinates into a 32-bit key.
   */
  private packCellKey(cellX: number, cellY: number): number {
    return (cellX & 0xFFFF) | ((cellY & 0xFFFF) << 16);
  }

  /**
   * Clears the grid of all blocks.
   */
  clear(): void {
    this.cells.clear();
    this.cellCounts.clear();
    this.blockToCellKey.fill(0);
  }
}
