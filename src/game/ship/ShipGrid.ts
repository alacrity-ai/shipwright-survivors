// src/game/ship/ShipGrid.ts

import type { Ship } from '@/game/ship/Ship';
import { Faction } from '@/game/interfaces/types/Faction';
import { Camera } from '@/core/Camera';

const CELL_SIZE = 3000;

interface ShipQueryResult {
  ships: Ship[];
  count: number;
}

export class ShipGrid {
  private static instance: ShipGrid | undefined;

  /** Returns the singleton instance. Throws if not yet initialized. */
  public static getInstance(): ShipGrid {
    if (!ShipGrid.instance) {
      ShipGrid.instance = new ShipGrid(CELL_SIZE);
    }
    return ShipGrid.instance;
  }

  private readonly cellSize: number = CELL_SIZE;

  private cells: Map<number, Map<number, Ship[]>> = new Map();
  private factionCells: Map<Faction, Map<number, Map<number, Ship[]>>> = new Map();
  private shipToCellMap: Map<string, [number, number]> = new Map();

  // Scratch buffer reused across queries for GC-neutral iteration
  private scratchShips: Ship[] = new Array(512); // Dynamically resizes
  private scratchCount = 0;

  private constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  /**
   * Gets all ships in a circular radius, GC-neutral.
   * Returns a view (ships, count) into an internal buffer — caller must not store it past this frame.
   */
  public getShipsInRadius(
    centerX: number,
    centerY: number,
    radius: number,
    excludeFaction?: Faction
  ): ShipQueryResult {
    const minX = centerX - radius;
    const minY = centerY - radius;
    const maxX = centerX + radius;
    const maxY = centerY + radius;

    this.scratchCount = 0;
    this.collectShipsInArea(minX, minY, maxX, maxY, excludeFaction);

    const radiusSq = radius * radius;
    let write = 0;

    for (let i = 0; i < this.scratchCount; i++) {
      const ship = this.scratchShips[i];
      const transform = ship.getTransform();
      if (!transform) continue;

      const dx = transform.position.x - centerX;
      const dy = transform.position.y - centerY;
      if ((dx * dx + dy * dy) <= radiusSq) {
        this.scratchShips[write++] = ship;
      }
    }

    this.scratchCount = write;

    return { ships: this.scratchShips, count: this.scratchCount };
  }

  /**
   * Gets all ships in an AABB region, GC-neutral.
   * Returns a view (ships, count) into an internal buffer — caller must not store it past this frame.
   */
  public getShipsInArea(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    excludeFaction?: Faction
  ): ShipQueryResult {
    this.scratchCount = 0;
    this.collectShipsInArea(minX, minY, maxX, maxY, excludeFaction);
    return { ships: this.scratchShips, count: this.scratchCount };
  }

  /** Fills scratchShips with all ships in the given AABB. */
  private collectShipsInArea(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    excludeFaction?: Faction
  ): void {
    const minCellX = Math.round(minX / this.cellSize);
    const minCellY = Math.round(minY / this.cellSize);
    const maxCellX = Math.round(maxX / this.cellSize);
    const maxCellY = Math.round(maxY / this.cellSize);

    const sources = this.getCellSources(excludeFaction);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        for (const map of sources) {
          const row = map.get(cx);
          if (!row) continue;
          const cell = row.get(cy);
          if (!cell) continue;

          for (let i = 0; i < cell.length; i++) {
            this.ensureScratchCapacity();
            this.scratchShips[this.scratchCount++] = cell[i];
          }
        }
      }
    }
  }

  /** Ensures the scratch buffer has capacity for at least one more entry. */
  private ensureScratchCapacity(): void {
    if (this.scratchCount < this.scratchShips.length) return;
    const newLength = this.scratchShips.length * 2;
    const newArray = new Array(newLength);
    for (let j = 0; j < this.scratchShips.length; j++) {
      newArray[j] = this.scratchShips[j];
    }
    this.scratchShips = newArray;
  }

  private getCellCoords(x: number, y: number): [number, number] {
    return [Math.round(x / this.cellSize), Math.round(y / this.cellSize)];
  }

  private getOrCreateCell(
    map: Map<number, Map<number, Ship[]>>,
    cellX: number,
    cellY: number
  ): Ship[] {
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

  private getFactionMap(faction: Faction): Map<number, Map<number, Ship[]>> {
    let factionMap = this.factionCells.get(faction);
    if (!factionMap) {
      factionMap = new Map();
      this.factionCells.set(faction, factionMap);
    }
    return factionMap;
  }

  private getCellSources(
    excludeFaction?: Faction
  ): Map<number, Map<number, Ship[]>>[] {
    if (!excludeFaction) return [this.cells];

    const result: Map<number, Map<number, Ship[]>>[] = [];
    for (const [faction, map] of this.factionCells) {
      if (faction !== excludeFaction && faction !== Faction.Neutral) {
        result.push(map);
      }
    }
    return result;
  }

  public addShip(ship: Ship): void {
    const transform = ship.getTransform();
    if (!transform) {
      console.warn('[ShipGrid] Skipping addShip: no transform for ship', ship.id);
      return;
    }

    const { x, y } = transform.position;
    const [cellX, cellY] = this.getCellCoords(x, y);

    this.removeShip(ship); // Remove from old cell if present

    const globalCell = this.getOrCreateCell(this.cells, cellX, cellY);
    globalCell.push(ship);

    const faction = ship.getFaction();
    const factionMap = this.getFactionMap(faction);
    const factionCell = this.getOrCreateCell(factionMap, cellX, cellY);
    factionCell.push(ship);

    this.shipToCellMap.set(ship.id, [cellX, cellY]);
  }

  public removeShip(ship: Ship): void {
    const currentCell = this.shipToCellMap.get(ship.id);
    if (!currentCell) return;

    const [cellX, cellY] = currentCell;

    const globalRow = this.cells.get(cellX);
    const globalCell = globalRow?.get(cellY);
    if (globalCell) {
      const idx = globalCell.indexOf(ship);
      if (idx !== -1) globalCell.splice(idx, 1);
    }

    const factionRow = this.getFactionMap(ship.getFaction()).get(cellX);
    const factionCell = factionRow?.get(cellY);
    if (factionCell) {
      const idx = factionCell.indexOf(ship);
      if (idx !== -1) factionCell.splice(idx, 1);
    }

    this.shipToCellMap.delete(ship.id);
  }

  public updateShipPosition(ship: Ship, dt: number): void {
    ship.updateStatusEffects(dt);

    const transform = ship.getTransform();
    if (!transform) return;

    const { x, y } = transform.position;
    const [newCellX, newCellY] = this.getCellCoords(x, y);
    const currentCell = this.shipToCellMap.get(ship.id);

    if (!currentCell) {
      this.addShip(ship);
      return;
    }

    const [oldCellX, oldCellY] = currentCell;
    if (oldCellX === newCellX && oldCellY === newCellY) return;

    this.addShip(ship); // Re-add to new cell
  }

  public getShipsInCameraView(
    margin: number = 0,
    excludeFaction?: Faction
  ): ShipQueryResult {
    const bounds = Camera.getInstance().getViewportBounds();
    const minX = bounds.x - margin;
    const minY = bounds.y - margin;
    const maxX = bounds.x + bounds.width + margin;
    const maxY = bounds.y + bounds.height + margin;
    return this.getShipsInArea(minX, minY, maxX, maxY, excludeFaction);
  }

  /**
   * Gets all ships, GC-neutral.
   * Returns a view (ships, count) into an internal buffer — caller must not store past this frame.
   */
  public getAllShips(excludeFaction?: Faction): ShipQueryResult {
    this.scratchCount = 0;
    const sources = this.getCellSources(excludeFaction);

    for (const map of sources) {
      for (const row of map.values()) {
        for (const cell of row.values()) {
          for (let i = 0; i < cell.length; i++) {
            this.ensureScratchCapacity();
            this.scratchShips[this.scratchCount++] = cell[i];
          }
        }
      }
    }
    return { ships: this.scratchShips, count: this.scratchCount };
  }

  public getShipCount(excludeFaction?: Faction): number {
    let count = 0;
    const sources = this.getCellSources(excludeFaction);

    for (const map of sources) {
      for (const row of map.values()) {
        for (const cell of row.values()) {
          count += cell.length;
        }
      }
    }

    return count;
  }

  public clear(): void {
    this.cells.clear();
    this.factionCells.clear();
    this.shipToCellMap.clear();
    this.scratchCount = 0;
  }

  public destroy(): void {
    this.clear();
  }

  public hasShip(ship: Ship): boolean {
    return this.shipToCellMap.has(ship.id);
  }

  public getDebugInfo(): {
    totalShips: number;
    cellsUsed: number;
    avgShipsPerCell: number;
  } {
    let totalShips = 0;
    let cellsUsed = 0;

    for (const row of this.cells.values()) {
      for (const cell of row.values()) {
        if (cell.length > 0) {
          totalShips += cell.length;
          cellsUsed++;
        }
      }
    }

    return {
      totalShips,
      cellsUsed,
      avgShipsPerCell: cellsUsed > 0 ? totalShips / cellsUsed : 0,
    };
  }
}
