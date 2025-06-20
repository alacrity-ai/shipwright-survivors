// src/systems/ai/ShipGrid.ts

// src/systems/physics/ShipGrid.ts

import type { Ship } from '@/game/ship/Ship';
import type { Faction } from '@/game/interfaces/types/Faction';

export class ShipGrid {
  private cells: Map<number, Map<number, Ship[]>> = new Map();
  private factionCells: Map<Faction, Map<number, Map<number, Ship[]>>> = new Map();
  private cellSize: number;
  private shipToCellMap: Map<string, [number, number]> = new Map();

  constructor(cellSize: number = 1000) { // Larger cells for ships
    this.cellSize = cellSize;
  }

  private getCellCoords(x: number, y: number): [number, number] {
    return [Math.floor(x / this.cellSize), Math.floor(y / this.cellSize)];
  }

  private getOrCreateCell(map: Map<number, Map<number, Ship[]>>, cellX: number, cellY: number): Ship[] {
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

  private getCellSources(excludeFaction?: Faction): Map<number, Map<number, Ship[]>>[] {
    if (!excludeFaction) return [this.cells];
    const result: Map<number, Map<number, Ship[]>>[] = [];
    for (const [faction, map] of this.factionCells) {
      if (faction !== excludeFaction) result.push(map);
    }
    return result;
  }

  addShip(ship: Ship): void {
    const transform = ship.getTransform();
    if (!transform) return;

    const { x, y } = transform.position;
    const [cellX, cellY] = this.getCellCoords(x, y);

    // Remove from old cell if it was already tracked
    this.removeShip(ship);

    // Add to global map
    const globalCell = this.getOrCreateCell(this.cells, cellX, cellY);
    globalCell.push(ship);

    // Add to faction-specific map
    const factionMap = this.getFactionMap(ship.getFaction());
    const factionCell = this.getOrCreateCell(factionMap, cellX, cellY);
    factionCell.push(ship);

    // Track ship's current cell
    this.shipToCellMap.set(ship.id, [cellX, cellY]);
  }

  removeShip(ship: Ship): void {
    const currentCell = this.shipToCellMap.get(ship.id);
    if (!currentCell) return;

    const [cellX, cellY] = currentCell;

    // Remove from global map
    const globalRow = this.cells.get(cellX);
    const globalCell = globalRow?.get(cellY);
    if (globalCell) {
      const idx = globalCell.indexOf(ship);
      if (idx !== -1) globalCell.splice(idx, 1);
    }

    // Remove from faction map
    const factionRow = this.getFactionMap(ship.getFaction()).get(cellX);
    const factionCell = factionRow?.get(cellY);
    if (factionCell) {
      const idx = factionCell.indexOf(ship);
      if (idx !== -1) factionCell.splice(idx, 1);
    }

    this.shipToCellMap.delete(ship.id);
  }

  updateShipPosition(ship: Ship): void {
    const transform = ship.getTransform();
    if (!transform) return;

    const { x, y } = transform.position;
    const [newCellX, newCellY] = this.getCellCoords(x, y);
    const currentCell = this.shipToCellMap.get(ship.id);

    // Only update if ship moved to a different cell
    if (!currentCell || currentCell[0] !== newCellX || currentCell[1] !== newCellY) {
      this.addShip(ship); // This will remove from old cell and add to new
    }
  }

  getShipsInArea(minX: number, minY: number, maxX: number, maxY: number, excludeFaction?: Faction): Ship[] {
    const minCellX = Math.floor(minX / this.cellSize);
    const minCellY = Math.floor(minY / this.cellSize);
    const maxCellX = Math.floor(maxX / this.cellSize);
    const maxCellY = Math.floor(maxY / this.cellSize);

    const ships: Ship[] = [];
    const sources = this.getCellSources(excludeFaction);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        for (const map of sources) {
          const row = map.get(cx);
          if (!row) continue;
          const cell = row.get(cy);
          if (cell) ships.push(...cell);
        }
      }
    }

    return ships;
  }

  getShipsInRadius(centerX: number, centerY: number, radius: number, excludeFaction?: Faction): Ship[] {
    const minX = centerX - radius;
    const minY = centerY - radius;
    const maxX = centerX + radius;
    const maxY = centerY + radius;

    const candidateShips = this.getShipsInArea(minX, minY, maxX, maxY, excludeFaction);
    const radiusSquared = radius * radius;

    return candidateShips.filter(ship => {
      const transform = ship.getTransform();
      if (!transform) return false;

      const dx = transform.position.x - centerX;
      const dy = transform.position.y - centerY;
      return (dx * dx + dy * dy) <= radiusSquared;
    });
  }

  getAllShips(excludeFaction?: Faction): Ship[] {
    const ships: Ship[] = [];
    const sources = this.getCellSources(excludeFaction);

    for (const map of sources) {
      for (const row of map.values()) {
        for (const cell of row.values()) {
          ships.push(...cell);
        }
      }
    }

    return ships;
  }

  getShipCount(excludeFaction?: Faction): number {
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

  clear(): void {
    this.cells.clear();
    this.factionCells.clear();
    this.shipToCellMap.clear();
  }

  // Debug method to visualize ship distribution
  getDebugInfo(): { totalShips: number; cellsUsed: number; avgShipsPerCell: number } {
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
      avgShipsPerCell: cellsUsed > 0 ? totalShips / cellsUsed : 0
    };
  }
}