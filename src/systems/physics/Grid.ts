// src/systems/physics/Grid.ts

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';

export class Grid {
  private cells: Map<string, BlockInstance[]> = new Map();  // Map of cell coordinates to blocks
  private cellSize: number;  // Size of each grid cell

  constructor(cellSize: number = 256) {
    this.cellSize = cellSize;
  }

  // Converts world position (x, y) to cell coordinates (grid position)
  getCellCoordinates(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  // Adds a block to the appropriate grid cell. Ensures that duplicates are not added.
  addBlockToCell(block: BlockInstance): void {
    const { x, y } = block.position!;  // Block's world position
    const cellKey = this.getCellCoordinates(x, y);  // Get the corresponding cell key

    if (!this.cells.has(cellKey)) {
      this.cells.set(cellKey, []);  // Create a new array for the cell if it doesn't exist
    }

    const cell = this.cells.get(cellKey)!;

    // Only add the block if it's not already in the cell
    if (!cell.includes(block)) {
      cell.push(block);
    }
  }

  // Removes a block from its corresponding grid cell.
  removeBlockFromCell(block: BlockInstance): void {
    const { x, y } = block.position!;
    const cellKey = this.getCellCoordinates(x, y);  // Get the cell key based on block position

    const cell = this.cells.get(cellKey);  // Get the cell for the block
    if (cell) {
      const index = cell.indexOf(block);
      if (index !== -1) {
        cell.splice(index, 1);  // Remove the block from the cell's block list
      }
    }
  }

  // Returns the blocks within a given cell, identified by world coordinates
  getBlocksInCell(x: number, y: number): BlockInstance[] {
    const cellKey = this.getCellCoordinates(x, y);
    return this.cells.get(cellKey) || [];  // Return blocks in cell, or empty array if no blocks
  }

  // Get all the relevant cells to check based on a given position (e.g., for projectiles)
  getRelevantCells(position: { x: number, y: number }): { x: number, y: number }[] {
    const relevantCells = [];
    const centerX = Math.floor(position.x / this.cellSize);
    const centerY = Math.floor(position.y / this.cellSize);

    // Add surrounding cells (including the cell the object is in) to the relevant cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        relevantCells.push({ x: centerX + dx, y: centerY + dy });
      }
    }

    return relevantCells;
  }

  /**
   * Traverses grid cells along a ray from start to end using 2D DDA.
   * Returns a flat list of all BlockInstances intersected by the ray path.
   */
  getBlocksAlongRay(start: { x: number; y: number }, end: { x: number; y: number }): BlockInstance[] {
    const blocksHit: Set<BlockInstance> = new Set();

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;

    const tDeltaX = Math.abs(this.cellSize / dx);
    const tDeltaY = Math.abs(this.cellSize / dy);

    let x = Math.floor(start.x / this.cellSize);
    let y = Math.floor(start.y / this.cellSize);

    const endX = Math.floor(end.x / this.cellSize);
    const endY = Math.floor(end.y / this.cellSize);

    let tMaxX: number;
    let tMaxY: number;

    const xOffset = dx > 0
      ? (x + 1) * this.cellSize - start.x
      : start.x - x * this.cellSize;
    tMaxX = Math.abs(xOffset / dx);

    const yOffset = dy > 0
      ? (y + 1) * this.cellSize - start.y
      : start.y - y * this.cellSize;
    tMaxY = Math.abs(yOffset / dy);

    const maxSteps = 500; // Guard against infinite traversal

    for (let steps = 0; steps < maxSteps; steps++) {
      const cellBlocks = this.getBlocksInCellByCoords(x, y);
      for (const block of cellBlocks) {
        blocksHit.add(block);
      }

      if (x === endX && y === endY) break;

      if (tMaxX < tMaxY) {
        tMaxX += tDeltaX;
        x += stepX;
      } else {
        tMaxY += tDeltaY;
        y += stepY;
      }
    }

    return Array.from(blocksHit);
  }

  // Get blocks in a cell using cell coordinates, not world coordinates
  getBlocksInCellByCoords(cellX: number, cellY: number): BlockInstance[] {
    const cellKey = `${cellX},${cellY}`;
    return this.cells.get(cellKey) || []; // Return blocks for the given cell, or empty array if none
  }

  // Clears all grid data
  clear(): void {
    this.cells.clear();
  }
}
