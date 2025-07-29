// src/game/spatialbodies/SpatialBodyGrid.ts

import { SpatialBodyStore } from './SpatialBodyStore';

/**
 * A lightweight, SOA-native spatial grid for broad-phase queries on static
 * spatial bodies (ice chunks, meteors, etc.).
 *
 * - Stores **spatial body indices** (no object references).
 * - Uses fixed-size cells (gridCellSize) for fast culling.
 * - Maintains a reverse map (bodyIndex → cellKey) for rehoming/removal.
 * - Allocation-free: queries return subarrays into a shared scratch buffer.
 */
export class SpatialBodyGrid {
  private readonly gridCellSize: number;
  private readonly cells: Map<number, Uint32Array>;
  private readonly cellCounts: Map<number, number>;
  private readonly bodyToCellKey: Int32Array;

  private static readonly INITIAL_CELL_CAPACITY = 64;
  private static readonly MAX_CELL_CAPACITY = 4096;

  constructor(
    private readonly store: SpatialBodyStore,
    gridCellSize: number = 512 // Larger than BoxSpatialGrid since these bodies are big set dressing
  ) {
    this.gridCellSize = gridCellSize;
    this.cells = new Map();
    this.cellCounts = new Map();

    // Reverse lookup: track which grid cell each body currently resides in
    this.bodyToCellKey = new Int32Array(store.capacity);
    this.bodyToCellKey.fill(-1);
  }

  /**
   * Registers a body into the spatial grid based on its world position.
   */
  register(index: number, worldX: number, worldY: number): void {
    const cellKey = this.computeCellKey(worldX, worldY);
    this.addToCell(cellKey, index);
    this.bodyToCellKey[index] = cellKey;
  }

  /**
   * Deregisters a body from the grid entirely.
   */
  deregister(index: number): void {
    const cellKey = this.bodyToCellKey[index];
    if (cellKey === -1) return;
    this.removeFromCell(cellKey, index);
    this.bodyToCellKey[index] = -1;
  }

  /**
   * Checks if a body is currently registered.
   */
  isRegistered(index: number): boolean {
    return this.bodyToCellKey[index] !== -1;
  }

  /**
   * Rehomes a body to the correct cell if it moved (rare for static bodies).
   */
  rehome(index: number, worldX: number, worldY: number): void {
    const newCellKey = this.computeCellKey(worldX, worldY);
    const oldCellKey = this.bodyToCellKey[index];
    if (newCellKey === oldCellKey) return;

    if (oldCellKey !== -1) {
      this.removeFromCell(oldCellKey, index);
    }
    this.addToCell(newCellKey, index);
    this.bodyToCellKey[index] = newCellKey;
  }

  getCellSize(): number {
    return this.gridCellSize;
  }

  /**
   * Queries all spatial bodies overlapping a rectangular world region.
   * Writes matching indices into `out` and returns the count.
   */
  getBodiesInArea(
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
        const bodies = this.cells.get(cellKey);
        const bodyCount = this.cellCounts.get(cellKey) ?? 0;
        if (!bodies || bodyCount === 0) continue;

        for (let i = 0; i < bodyCount; i++) {
          out[count++] = bodies[i];
        }
      }
    }

    return count;
  }

  /**
   * Adds a spatial body to a specific grid cell (dynamically resizes buffer if needed).
   */
  private addToCell(cellKey: number, index: number): void {
    let bodies = this.cells.get(cellKey);
    let count = this.cellCounts.get(cellKey) ?? 0;

    if (!bodies) {
      bodies = new Uint32Array(SpatialBodyGrid.INITIAL_CELL_CAPACITY);
      this.cells.set(cellKey, bodies);
      count = 0;
    } else if (count >= bodies.length) {
      const newCapacity = Math.min(
        bodies.length * 2,
        SpatialBodyGrid.MAX_CELL_CAPACITY
      );
      const newBodies = new Uint32Array(newCapacity);
      newBodies.set(bodies);
      bodies = newBodies;
      this.cells.set(cellKey, bodies);
    }

    bodies[count] = index;
    this.cellCounts.set(cellKey, count + 1);
  }

  /**
   * Removes a body from a grid cell via swap-with-last.
   */
  private removeFromCell(cellKey: number, index: number): void {
    const bodies = this.cells.get(cellKey);
    const count = this.cellCounts.get(cellKey) ?? 0;
    if (!bodies || count === 0) return;

    let found = -1;
    for (let i = 0; i < count; i++) {
      if (bodies[i] === index) {
        found = i;
        break;
      }
    }
    if (found === -1) return;

    const last = count - 1;
    if (found !== last) {
      bodies[found] = bodies[last];
    }

    bodies[last] = 0;
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
   * Packs cell coordinates into a single 32-bit integer.
   */
  private packCellKey(cellX: number, cellY: number): number {
    const bx = cellX + 32768;
    const by = cellY + 32768;
    return (bx & 0xffff) | ((by & 0xffff) << 16);
  }

  /**
   * Clears all cells and resets the grid.
   */
  clear(): void {
    this.cells.clear();
    this.cellCounts.clear();
    this.bodyToCellKey.fill(-1);
  }
}
