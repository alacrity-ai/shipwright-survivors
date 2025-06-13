// src/systems/physics/Grid.ts

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { Faction } from '@/game/interfaces/types/Faction';

export interface RaycastHit {
  block: BlockInstance;
  point: { x: number; y: number };
}

export class Grid {
  private cells: Map<number, Map<number, BlockInstance[]>> = new Map();
  private factionCells: Map<Faction, Map<number, Map<number, BlockInstance[]>>> = new Map();
  private cellSize: number;

  constructor(cellSize: number = 256) {
    this.cellSize = cellSize;
  }

  private getCellCoords(x: number, y: number): [number, number] {
    return [Math.floor(x / this.cellSize), Math.floor(y / this.cellSize)];
  }

  private getOrCreateCell(map: Map<number, Map<number, BlockInstance[]>>, cellX: number, cellY: number): BlockInstance[] {
    let row = map.get(cellX);
    if (!row) {
      row = new Map();
      map.set(cellX, row);
    }
    let cell = row.get(cellY);
    if (!cell) {
      cell = [];
      row.set(cellY, cell);
    }
    return cell;
  }

  private getFactionMap(faction: Faction): Map<number, Map<number, BlockInstance[]>> {
    let factionMap = this.factionCells.get(faction);
    if (!factionMap) {
      factionMap = new Map();
      this.factionCells.set(faction, factionMap);
    }
    return factionMap;
  }

  private getCellSources(excludeFaction?: Faction): Map<number, Map<number, BlockInstance[]>>[] {
    if (!excludeFaction) return [this.cells];
    const result: Map<number, Map<number, BlockInstance[]>>[] = [];
    for (const [faction, map] of this.factionCells) {
      if (faction !== excludeFaction) result.push(map);
    }
    return result;
  }

  addBlockToCell(block: BlockInstance): void {
    const { x, y } = block.position!;
    const [cellX, cellY] = this.getCellCoords(x, y);

    // Add to global map
    const globalCell = this.getOrCreateCell(this.cells, cellX, cellY);
    if (!globalCell.includes(block)) globalCell.push(block);

    // Add to faction-specific map
    const factionMap = this.getFactionMap(block.ownerFaction);
    const factionCell = this.getOrCreateCell(factionMap, cellX, cellY);
    if (!factionCell.includes(block)) factionCell.push(block);
  }

  removeBlockFromCell(block: BlockInstance): void {
    const { x, y } = block.position!;
    const [cellX, cellY] = this.getCellCoords(x, y);

    // Remove from global map
    const globalRow = this.cells.get(cellX);
    const globalCell = globalRow?.get(cellY);
    if (globalCell) {
      const idx = globalCell.indexOf(block);
      if (idx !== -1) globalCell.splice(idx, 1);
    }

    // Remove from faction map
    const factionRow = this.getFactionMap(block.ownerFaction).get(cellX);
    const factionCell = factionRow?.get(cellY);
    if (factionCell) {
      const idx = factionCell.indexOf(block);
      if (idx !== -1) factionCell.splice(idx, 1);
    }
  }

  removeBlocksFromCells(blocks: BlockInstance[]): void {
    for (const block of blocks) {
      this.removeBlockFromCell(block);
    }
  }

  getBlocksInCell(x: number, y: number, excludeFaction?: Faction): BlockInstance[] {
    const [cellX, cellY] = this.getCellCoords(x, y);
    return this.getBlocksInCellByCoords(cellX, cellY, excludeFaction);
  }

  getBlocksInCellByCoords(cellX: number, cellY: number, excludeFaction?: Faction): BlockInstance[] {
    const sources = this.getCellSources(excludeFaction);
    const result: BlockInstance[] = [];
    for (const map of sources) {
      const row = map.get(cellX);
      if (!row) continue;
      const cell = row.get(cellY);
      if (cell) result.push(...cell);
    }
    return result;
  }

  getRelevantCells(pos: { x: number; y: number }): { x: number; y: number }[] {
    const centerX = Math.floor(pos.x / this.cellSize);
    const centerY = Math.floor(pos.y / this.cellSize);

    const cells = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        cells.push({ x: centerX + dx, y: centerY + dy });
      }
    }
    return cells;
  }

  getAllBlocksInCells(minX: number, minY: number, maxX: number, maxY: number, excludeFaction?: Faction): BlockInstance[] {
    const blocks: BlockInstance[] = [];
    const sources = this.getCellSources(excludeFaction);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        for (const map of sources) {
          const row = map.get(cx);
          if (!row) continue;
          const cell = row.get(cy);
          if (cell) blocks.push(...cell);
        }
      }
    }

    return blocks;
  }

  getBlocksInArea(minX: number, minY: number, maxX: number, maxY: number, excludeFaction?: Faction): BlockInstance[] {
    const minCellX = Math.floor(minX / this.cellSize);
    const minCellY = Math.floor(minY / this.cellSize);
    const maxCellX = Math.floor(maxX / this.cellSize);
    const maxCellY = Math.floor(maxY / this.cellSize);
    return this.getAllBlocksInCells(minCellX, minCellY, maxCellX, maxCellY, excludeFaction);
  }

  getBlocksAlongRay(
    start: { x: number; y: number },
    end: { x: number; y: number },
    beamThickness: number = 0,
    excludeFaction?: Faction
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

    const xOffset = dx > 0
      ? (x + 1) * this.cellSize - start.x
      : start.x - x * this.cellSize;
    const yOffset = dy > 0
      ? (y + 1) * this.cellSize - start.y
      : start.y - y * this.cellSize;

    let tMaxX = Math.abs(xOffset / dx);
    let tMaxY = Math.abs(yOffset / dy);

    const maxSteps = 500;
    let sideOffsets: [number, number][] = [[0, 0]];

    if (beamThickness > 0) {
      const radius = beamThickness / 2;
      const mag = Math.sqrt(dx * dx + dy * dy);
      const dirX = dx / mag;
      const dirY = dy / mag;
      const normalX = -dirY;
      const normalY = dirX;
      const cellRadius = Math.ceil(radius / this.cellSize);
      const seen = new Set<number>();
      sideOffsets = [];

      for (let i = -cellRadius; i <= cellRadius; i++) {
        const offsetX = Math.round(normalX * i);
        const offsetY = Math.round(normalY * i);
        const hash = (offsetX << 8) ^ offsetY;
        if (!seen.has(hash)) {
          seen.add(hash);
          sideOffsets.push([offsetX, offsetY]);
        }
      }
    }

    for (let steps = 0; steps < maxSteps; steps++) {
      for (const [ox, oy] of sideOffsets) {
        const cx = x + ox;
        const cy = y + oy;
        const blocks = this.getBlocksInCellByCoords(cx, cy, excludeFaction);
        for (const block of blocks) {
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

  getFirstBlockAlongRay(
    origin: { x: number; y: number },
    target: { x: number; y: number },
    excludeFaction?: Faction
  ): RaycastHit | null {
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return null;

    const rayDir = { x: dx / mag, y: dy / mag };
    const blocks = this.getBlocksAlongRay(origin, target, 0, excludeFaction);

    let closestHit: RaycastHit | null = null;
    let closestT = Infinity;

    for (const block of blocks) {
      const pos = block.position!;
      const half = this.cellSize / 2;
      const min = { x: pos.x - half, y: pos.y - half };
      const max = { x: pos.x + half, y: pos.y + half };

      const result = rayIntersectsAABB(origin, rayDir, min, max);
      if (result.hit && result.tmin >= 0 && result.tmin < closestT && result.tmin <= mag) {
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

  clear(): void {
    this.cells.clear();
    this.factionCells.clear();
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
