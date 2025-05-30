// src/systems/physics/Grid.ts

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';


export interface RaycastHit {
  block: BlockInstance;
  point: { x: number; y: number };
}

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
 * Optionally expands sampling orthogonally based on `beamThickness` (in world units).
 * Returns a flat list of all BlockInstances intersected by the ray path.
 */
  getBlocksAlongRay(
    start: { x: number; y: number },
    end: { x: number; y: number },
    beamThickness: number = 0
  ): BlockInstance[] {
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

    const maxSteps = 500;

    // Precompute orthogonal offset range
    let sideOffsets: [number, number][] = [[0, 0]];

    if (beamThickness > 0) {
      const radius = beamThickness / 2;

      // Normalize direction
      const mag = Math.sqrt(dx * dx + dy * dy);
      const dirX = dx / mag;
      const dirY = dy / mag;

      // Perpendicular vector
      const normalX = -dirY;
      const normalY = dirX;

      // Sample grid offsets within beam radius
      const maxOffset = Math.ceil(radius / this.cellSize);
      sideOffsets = [];

      for (let i = -maxOffset; i <= maxOffset; i++) {
        const offsetX = Math.round(normalX * i);
        const offsetY = Math.round(normalY * i);
        sideOffsets.push([offsetX, offsetY]);
      }
    }

    for (let steps = 0; steps < maxSteps; steps++) {
      for (const [ox, oy] of sideOffsets) {
        const cx = x + ox;
        const cy = y + oy;

        const cellBlocks = this.getBlocksInCellByCoords(cx, cy);
        for (const block of cellBlocks) {
          blocksHit.add(block);
        }
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
  
  public getFirstBlockAlongRay(
    origin: { x: number; y: number },
    target: { x: number; y: number },
    excludeShipId?: string
  ): RaycastHit | null {
    const dirX = target.x - origin.x;
    const dirY = target.y - origin.y;
    const mag = Math.sqrt(dirX * dirX + dirY * dirY);

    if (mag === 0) return null;

    const rayDir = { x: dirX / mag, y: dirY / mag };
    const blocks = this.getBlocksAlongRay(origin, target);

    let closestHit: RaycastHit | null = null;
    let closestT = Infinity;

    for (const block of blocks) {
      if (excludeShipId && block.ownerShipId === excludeShipId) continue;

      const blockPos = block.position!;
      const halfSize = this.cellSize / 2; // Assume block size == cell size

      const boxMin = { x: blockPos.x - halfSize, y: blockPos.y - halfSize };
      const boxMax = { x: blockPos.x + halfSize, y: blockPos.y + halfSize };

      const result = rayIntersectsAABB(origin, rayDir, boxMin, boxMax);
      if (result.hit && result.tmin < closestT && result.tmin >= 0 && result.tmin <= mag) {
        closestT = result.tmin;
        closestHit = {
          block,
          point: {
            x: origin.x + rayDir.x * result.tmin,
            y: origin.y + rayDir.y * result.tmin
          }
        };
      }
    }

    return closestHit;
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

function rayIntersectsAABB(
  rayStart: { x: number; y: number },
  rayDir: { x: number; y: number },
  boxMin: { x: number; y: number },
  boxMax: { x: number; y: number }
): { hit: boolean; tmin: number } {
  const invDirX = 1 / rayDir.x;
  const invDirY = 1 / rayDir.y;

  let t1 = (boxMin.x - rayStart.x) * invDirX;
  let t2 = (boxMax.x - rayStart.x) * invDirX;
  let t3 = (boxMin.y - rayStart.y) * invDirY;
  let t4 = (boxMax.y - rayStart.y) * invDirY;

  const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
  const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

  return { hit: tmax >= Math.max(0, tmin), tmin };
}
