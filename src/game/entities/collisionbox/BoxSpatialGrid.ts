// src/game/collision/system/BoxSpatialGrid.ts

import { CollisionBoxStore } from '@/game/entities/collisionbox/CollisionBoxStore';

/**
 * A lightweight, SOA-native spatial grid for broad-phase collision box queries.
 *
 * - Stores **collision box indices** (no objects).
 * - Uses fixed-size cells (gridCellSize) for efficient spatial partitioning.
 * - Maintains reverse mapping (boxIndex → cell key) for fast rehoming.
 * - Allocation-free: queries return subarrays into a shared scratch buffer.
 */
export class BoxSpatialGrid {
  private readonly gridCellSize: number;
  private readonly cells: Map<number, Uint32Array>;
  private readonly cellCounts: Map<number, number>;
  private readonly boxToCellKey: Int32Array;

  // Default cell buffer size (doubles when exceeded)
  private static readonly INITIAL_CELL_CAPACITY = 64;
  private static readonly MAX_CELL_CAPACITY = 4096;

  // Scratch buffer for allocation-free query results
  private static readonly SCRATCH = new Uint32Array(4096);
  private scratchCount: number = 0;

  constructor(
    private readonly store: CollisionBoxStore,
    gridCellSize: number = 256 // boxes are larger than blocks, so bigger cell size
  ) {
    this.gridCellSize = gridCellSize;
    this.cells = new Map();
    this.cellCounts = new Map();

    // Reverse lookup: which grid cell each collision box currently resides in
    this.boxToCellKey = new Int32Array(store.capacity);
    this.boxToCellKey.fill(-1);
  }

  /**
   * Registers a collision box into the spatial grid based on its current world center.
   */
  registerBox(index: number, worldX: number, worldY: number): void {
    const cellKey = this.computeCellKey(worldX, worldY);
    this.addToCell(cellKey, index);
    this.boxToCellKey[index] = cellKey;
  }

  /**
   * Removes a collision box from its current grid cell.
   */
  deregisterBox(index: number): void {
    const cellKey = this.boxToCellKey[index];
    if (cellKey === -1) return;
    this.removeFromCell(cellKey, index);
    this.boxToCellKey[index] = -1;
  }

  /**
   * Returns true if the collision box is currently registered in the grid.
   */
  public isRegistered(index: number): boolean {
    return this.boxToCellKey[index] !== -1;
  }

  /**
   * Efficiently rehomes a collision box to the correct cell if it moved.
   */
  rehomeBoxIndex(index: number, worldX: number, worldY: number): void {
    const newCellKey = this.computeCellKey(worldX, worldY);
    const oldCellKey = this.boxToCellKey[index];
    if (newCellKey === oldCellKey) return;

    if (oldCellKey !== -1) {
      this.removeFromCell(oldCellKey, index);
    }
    this.addToCell(newCellKey, index);
    this.boxToCellKey[index] = newCellKey;
  }

  getCellSize(): number {
    return this.gridCellSize;
  }

  /**
   * Queries all collision boxes overlapping a rectangular world region.
   * Returns a subarray of indices (allocation-free).
   */
  getBoxesInArea(
    centerX: number,
    centerY: number,
    queryRadius: number,
    out: Uint32Array
  ): number {
    const minX = centerX - queryRadius;
    const minY = centerY - queryRadius;
    const maxX = centerX + queryRadius;
    const maxY = centerY + queryRadius;

    const minCellX = Math.floor(minX / this.gridCellSize);
    const minCellY = Math.floor(minY / this.gridCellSize);
    const maxCellX = Math.floor(maxX / this.gridCellSize);
    const maxCellY = Math.floor(maxY / this.gridCellSize);

    let count = 0;
    for (let cy = minCellY; cy <= maxCellY; cy++) {
      for (let cx = minCellX; cx <= maxCellX; cx++) {
        const cellKey = this.packCellKey(cx, cy);
        const boxes = this.cells.get(cellKey);
        const boxCount = this.cellCounts.get(cellKey) ?? 0;
        if (!boxes || boxCount === 0) continue;

        for (let i = 0; i < boxCount; i++) {
          out[count++] = boxes[i];
        }
      }
    }

    return count;
  }

  /**
   * Adds a collision box to a specific grid cell, resizing the buffer if needed.
   */
  private addToCell(cellKey: number, index: number): void {
    let boxes = this.cells.get(cellKey);
    let count = this.cellCounts.get(cellKey) ?? 0;

    if (!boxes) {
      boxes = new Uint32Array(BoxSpatialGrid.INITIAL_CELL_CAPACITY);
      this.cells.set(cellKey, boxes);
      count = 0;
    } else if (count >= boxes.length) {
      // Double capacity, up to the maximum
      const newCapacity = Math.min(boxes.length * 2, BoxSpatialGrid.MAX_CELL_CAPACITY);
      const newBoxes = new Uint32Array(newCapacity);
      newBoxes.set(boxes);
      boxes = newBoxes;
      this.cells.set(cellKey, boxes);
    }

    boxes[count] = index;
    this.cellCounts.set(cellKey, count + 1);
  }

  /**
   * Removes a collision box from a specific grid cell via swap-with-last.
   */
  private removeFromCell(cellKey: number, index: number): void {
    const boxes = this.cells.get(cellKey);
    const count = this.cellCounts.get(cellKey) ?? 0;
    if (!boxes || count === 0) return;

    let found = -1;
    for (let i = 0; i < count; i++) {
      if (boxes[i] === index) {
        found = i;
        break;
      }
    }
    if (found === -1) return;

    const last = count - 1;
    if (found !== last) {
      boxes[found] = boxes[last];
    }

    boxes[last] = 0; // clear stale
    this.cellCounts.set(cellKey, last);
  }

  /**
   * Computes a packed key for a world-space grid cell.
   */
  private computeCellKey(worldX: number, worldY: number): number {
    const cellX = Math.floor(worldX / this.gridCellSize);
    const cellY = Math.floor(worldY / this.gridCellSize);
    return this.packCellKey(cellX, cellY);
  }

  /**
   * Packs cell coordinates into a 32-bit integer (signed safe).
   */
  private packCellKey(cellX: number, cellY: number): number {
    const bx = cellX + 32768;
    const by = cellY + 32768;
    return (bx & 0xFFFF) | ((by & 0xFFFF) << 16);
  }

  /**
   * Clears the spatial grid entirely.
   */
  clear(): void {
    this.cells.clear();
    this.cellCounts.clear();
    this.boxToCellKey.fill(-1);
  }
}
