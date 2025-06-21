// src/game/entities/CompositeBlockObjectGrid.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import { Camera } from '@/core/Camera';

const DEBUG = false;

export class CompositeBlockObjectGrid<T extends CompositeBlockObject> {
  private cells = new Map<number, Map<number, T[]>>();
  private objectToCell = new Map<string, [number, number]>();

  constructor(private cellSize: number = 1000) {}

  /** Use Math.round to prevent jittering across negative boundaries */
  private getCellCoords(x: number, y: number): [number, number] {
    return [Math.round(x / this.cellSize), Math.round(y / this.cellSize)];
  }

  private getOrCreateCell(x: number, y: number): T[] {
    let row = this.cells.get(x);
    if (!row) this.cells.set(x, row = new Map());
    let cell = row.get(y);
    if (!cell) row.set(y, cell = []);
    return cell;
  }

  /** Returns all registered composite block objects across all cells. */
  public getAllObjects(): T[] {
    const allObjects: T[] = [];
    for (const row of this.cells.values()) {
      for (const cell of row.values()) {
        allObjects.push(...cell);
      }
    }
    return allObjects;
  }

  /** Returns whether a given object is currently registered in the grid. */
  public has(obj: T): boolean {
    return this.objectToCell.has(obj.id);
  }

  public add(obj: T): void {
    const { x, y } = obj.getTransform().position;
    const [cx, cy] = this.getCellCoords(x, y);

    const existingCoords = this.objectToCell.get(obj.id);
    if (existingCoords) {
      const [oldX, oldY] = existingCoords;
      if (oldX === cx && oldY === cy) {
        return; // Already in correct cell
      }
      this.remove(obj); // Remove from old cell
    }

    this.getOrCreateCell(cx, cy).push(obj);
    this.objectToCell.set(obj.id, [cx, cy]);
  }

  public remove(obj: T): void {
    const coords = this.objectToCell.get(obj.id);
    if (!coords) return;

    const [cx, cy] = coords;
    const row = this.cells.get(cx);
    const cell = row?.get(cy);
    if (!cell) return;

    const idx = cell.indexOf(obj);
    if (idx !== -1) {
      cell.splice(idx, 1);
    }

    this.objectToCell.delete(obj.id);
  }

  public update(obj: T): void {
    const { x, y } = obj.getTransform().position;
    const [cx, cy] = this.getCellCoords(x, y);

    const existingCoords = this.objectToCell.get(obj.id);
    if (!existingCoords) {
      return;
    }

    const [oldCX, oldCY] = existingCoords;
    if (cx === oldCX && cy === oldCY) return;

    this.remove(obj);
    this.getOrCreateCell(cx, cy).push(obj);
    this.objectToCell.set(obj.id, [cx, cy]);
  }

  /** Returns all objects that intersect the specified world-space bounding box. */
  public getObjectsInArea(minX: number, minY: number, maxX: number, maxY: number): T[] {
    const minCX = Math.round(minX / this.cellSize);
    const minCY = Math.round(minY / this.cellSize);
    const maxCX = Math.round(maxX / this.cellSize);
    const maxCY = Math.round(maxY / this.cellSize);

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

  /** Returns all objects visible in the current camera viewport plus optional margin. */
  public getObjectsInCameraView(margin: number = 0): T[] {
    const bounds = Camera.getInstance().getViewportBounds();

    const minX = bounds.x - margin;
    const minY = bounds.y - margin;
    const maxX = bounds.x + bounds.width + margin;
    const maxY = bounds.y + bounds.height + margin;

    return this.getObjectsInArea(minX, minY, maxX, maxY);
  }

  /** Removes all registered objects and clears the grid. */
  public clear(): void {
    this.cells.clear();
    this.objectToCell.clear();
  }
}
