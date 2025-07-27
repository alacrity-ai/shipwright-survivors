// src/game/collision/system/CollisionBoxOrchestrator.ts

import { CollisionBoxStore } from '@/game/entities/collisionbox/CollisionBoxStore';
import { BoxSpatialGrid } from '@/game/entities/collisionbox/BoxSpatialGrid';

export interface CollisionBoxTransform {
  position: { x: number; y: number };
  rotation: number; // radians
}

export interface CreateCollisionBoxParams {
  shipNumericId: number;
  localX1: number;
  localY1: number;
  localX2: number;
  localY2: number;
}

/**
 * Manages the lifecycle and transforms of all ship-level OBBs,
 * ensuring they remain centered around their true AABB centroid.
 */
export class CollisionBoxOrchestrator {
  private store: CollisionBoxStore;
  private grid: BoxSpatialGrid;

  private shipToBoxIndex: Map<number, number> = new Map();

  private static readonly SCRATCH_CORNERS: { x: number; y: number }[] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];

  constructor(store: CollisionBoxStore, grid: BoxSpatialGrid) {
    this.store = store;
    this.grid = grid;
  }

  createCollisionBox(params: CreateCollisionBoxParams): number {
    const index = this.store.allocateIndex(
      params.shipNumericId,
      params.localX1,
      params.localY1,
      params.localX2,
      params.localY2
    );
    if (index === -1) return -1;

    this.shipToBoxIndex.set(params.shipNumericId, index);
    return index;
  }

  createAndRegisterCollisionBox(
    params: CreateCollisionBoxParams,
    worldPos: { x: number; y: number },
    rotation: number
  ): number {
    const index = this.createCollisionBox(params);
    if (index === -1) return -1;

    this.updateWorldTransform(index, worldPos, rotation);
    this.grid.registerBox(index, this.store.worldX[index], this.store.worldY[index]);
    return index;
  }

  destroyCollisionBox(index: number): void {
    if (index < 0 || index >= this.store.capacity || !this.store.isAllocated(index)) return;

    const shipId = this.store.shipNumericId[index];
    this.shipToBoxIndex.delete(shipId);

    this.grid.deregisterBox(index);
    this.store.freeIndex(index);
  }

  /**
   * Updates world-space center, rotation, and rotated corners,
   * factoring in the pivot offset from the ship origin.
   */
  updateWorldTransform(index: number, shipPos: { x: number; y: number }, rotation: number): void {
    const s = this.store;

    // Compute true world center from ship position + rotated pivot offset
    const offX = s.pivotOffsetX[index];
    const offY = s.pivotOffsetY[index];
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);
    const centerX = shipPos.x + (offX * cosR - offY * sinR);
    const centerY = shipPos.y + (offX * sinR + offY * cosR);

    s.worldX[index] = centerX;
    s.worldY[index] = centerY;
    s.rotation[index] = rotation;

    // Now compute rotated OBB corners (local extents are centered on 0,0)
    const lx1 = s.localX1[index];
    const ly1 = s.localY1[index];
    const lx2 = s.localX2[index];
    const ly2 = s.localY2[index];

    let rx: number, ry: number;

    // Top-left
    rx = lx1 * cosR - ly1 * sinR;
    ry = lx1 * sinR + ly1 * cosR;
    s.worldX1[index] = centerX + rx;
    s.worldY1[index] = centerY + ry;

    // Bottom-left
    rx = lx1 * cosR - ly2 * sinR;
    ry = lx1 * sinR + ly2 * cosR;
    s.worldX2[index] = centerX + rx;
    s.worldY2[index] = centerY + ry;

    // Bottom-right
    rx = lx2 * cosR - ly2 * sinR;
    ry = lx2 * sinR + ly2 * cosR;
    s.worldX3[index] = centerX + rx;
    s.worldY3[index] = centerY + ry;

    // Top-right
    rx = lx2 * cosR - ly1 * sinR;
    ry = lx2 * sinR + ly1 * cosR;
    s.worldX4[index] = centerX + rx;
    s.worldY4[index] = centerY + ry;
  }

  rehomeBox(index: number): void {
    const s = this.store;
    this.grid.rehomeBoxIndex(index, s.worldX[index], s.worldY[index]);
  }

  updateAndSync(index: number, shipPos: { x: number; y: number }, rotation: number): void {
    this.updateWorldTransform(index, shipPos, rotation);
    this.rehomeBox(index);
  }

  getBoxIndexByShipId(shipId: number): number | undefined {
    return this.shipToBoxIndex.get(shipId);
  }

  getShipIdByBoxIndex(index: number): number {
    return this.store.shipNumericId[index];
  }

  getWorldCorners(index: number): { x: number; y: number }[] {
    const s = this.store;
    const c = CollisionBoxOrchestrator.SCRATCH_CORNERS;

    c[0].x = s.worldX1[index]; c[0].y = s.worldY1[index];
    c[1].x = s.worldX2[index]; c[1].y = s.worldY2[index];
    c[2].x = s.worldX3[index]; c[2].y = s.worldY3[index];
    c[3].x = s.worldX4[index]; c[3].y = s.worldY4[index];

    return c;
  }

  getCollisionBoxesInArea(
    cx: number,
    cy: number,
    radius: number,
    out: Uint32Array
  ): number {
    return this.grid.getBoxesInArea(cx, cy, radius, out);
  }

  clearAll(): void {
    this.store.clear();
    this.grid.clear();
    this.shipToBoxIndex.clear();
  }
}
