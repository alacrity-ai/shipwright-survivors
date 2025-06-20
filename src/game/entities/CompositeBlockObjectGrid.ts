// src/game/entities/CompositeBlockObjectGrid.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';

import { Camera } from '@/core/Camera';

export class CompositeBlockObjectGrid<T extends CompositeBlockObject> {
  private cells = new Map<number, Map<number, T[]>>();
  private objectToCell = new Map<string, [number, number]>();
  constructor(private cellSize: number = 1000) {}

  private getCellCoords(x: number, y: number): [number, number] {
    return [Math.floor(x / this.cellSize), Math.floor(y / this.cellSize)];
  }

  private getOrCreateCell(x: number, y: number): T[] {
    let row = this.cells.get(x);
    if (!row) this.cells.set(x, row = new Map());
    let cell = row.get(y);
    if (!cell) row.set(y, cell = []);
    return cell;
  }

  add(obj: T): void {
    const { x, y } = obj.getTransform().position;
    const [cx, cy] = this.getCellCoords(x, y);
    this.remove(obj); // remove from old if present
    this.getOrCreateCell(cx, cy).push(obj);
    this.objectToCell.set(obj.id, [cx, cy]);
  }

  remove(obj: T): void {
    const coords = this.objectToCell.get(obj.id);
    if (!coords) return;
    const [cx, cy] = coords;
    const row = this.cells.get(cx);
    const cell = row?.get(cy);
    if (cell) {
      const idx = cell.indexOf(obj);
      if (idx !== -1) cell.splice(idx, 1);
    }
    this.objectToCell.delete(obj.id);
  }

  update(obj: T): void {
    const { x, y } = obj.getTransform().position;
    const [cx, cy] = this.getCellCoords(x, y);
    const oldCoords = this.objectToCell.get(obj.id);
    if (!oldCoords || oldCoords[0] !== cx || oldCoords[1] !== cy) {
      this.add(obj);
    }
  }

  getObjectsInArea(minX: number, minY: number, maxX: number, maxY: number): T[] {
    const minCX = Math.floor(minX / this.cellSize);
    const minCY = Math.floor(minY / this.cellSize);
    const maxCX = Math.floor(maxX / this.cellSize);
    const maxCY = Math.floor(maxY / this.cellSize);

    const result: T[] = [];
    for (let cx = minCX; cx <= maxCX; cx++) {
      const row = this.cells.get(cx);
      if (!row) continue;
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = row.get(cy);
        if (cell) result.push(...cell);
      }
    }
    return result;
  }

  getObjectsInCameraView(margin: number = 0): T[] {
    const bounds = Camera.getInstance().getViewportBounds();

    const minX = bounds.x - margin;
    const minY = bounds.y - margin;
    const maxX = bounds.x + bounds.width + margin;
    const maxY = bounds.y + bounds.height + margin;

    return this.getObjectsInArea(minX, minY, maxX, maxY);
  }

  clear(): void {
    this.cells.clear();
    this.objectToCell.clear();
  }
}
