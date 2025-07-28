// src/systems/collision/CollisionBoxSystem.ts

import { CollisionBoxManager } from '@/game/entities/collisionbox/CollisionBoxManager';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';

/**
 * Handles broad-phase enemy-to-enemy ship collision resolution.
 * Uses ship-level bounding boxes (OBBs approximated as circles) for spacing.
 *
 * GC-neutral: uses preallocated buffers and no per-frame object allocations.
 */
export class CollisionBoxSystem {
  private static readonly QUERY_RADIUS_FACTOR = 2.0;     // how far to query neighbors (× radius)
  private static readonly PENETRATION_SLOP = 4;          // pixels of tolerance before separation
  private static readonly PENETRATION_CORRECTION_RATIO = 0.5; // fraction of overlap to resolve

  // At the top of the class, add:
  private static readonly MAX_QUERY_RADIUS = 1500; // pixels, tune as needed

  private readonly store = CollisionBoxManager.getInstance().getCollisionBoxStore();
  private readonly grid = CollisionBoxManager.getInstance().getBoxSpatialGrid();
  private readonly orchestrator = CollisionBoxManager.getInstance().getCollisionBoxOrchestrator();

  // Preallocated buffer for candidate neighbor indices (tunable capacity)
  private readonly _candidateBuffer: Uint32Array;

  constructor(maxCandidates = 64) {
    this._candidateBuffer = new Uint32Array(maxCandidates);
  }

  /**
   * Resolves enemy-to-enemy overlaps by pushing ships apart symmetrically.
   * Should be invoked once per frame, after transforms update but before AI steering.
   */
  public update(dt: number): void {
    const { store, grid } = this;
    const active = store.activeIndices;
    const count = store.activeCount;

    if (count <= 1) return;

    for (let i = 0; i < count; i++) {
      const idxA = active[i];
      const xA = store.worldX[idxA];
      const yA = store.worldY[idxA];
      const rA = Math.max(store.halfWidth[idxA], store.halfHeight[idxA]);

      // Clamp query radius to prevent performance spikes from huge ships
      const queryRadius = Math.min(
        rA * CollisionBoxSystem.QUERY_RADIUS_FACTOR,
        CollisionBoxSystem.MAX_QUERY_RADIUS
      );

      // Broad-phase query for nearby boxes
      const candidateCount = grid.getBoxesInArea(
        xA,
        yA,
        queryRadius,
        this._candidateBuffer
      );

      for (let j = 0; j < candidateCount; j++) {
        const idxB = this._candidateBuffer[j];
        // Only process each pair once
        if (idxB <= idxA) continue;

        this.resolvePair(idxA, idxB);
      }
    }
  }

  /**
   * Resolves a single overlapping pair of collision boxes.
   * Uses circle proxies (radius = max(halfWidth, halfHeight)) for speed.
   */
  private resolvePair(idxA: number, idxB: number): void {
    const { store } = this;

    const xA = store.worldX[idxA], yA = store.worldY[idxA];
    const xB = store.worldX[idxB], yB = store.worldY[idxB];

    const rA = Math.max(store.halfWidth[idxA], store.halfHeight[idxA]);
    const rB = Math.max(store.halfWidth[idxB], store.halfHeight[idxB]);

    const dx = xB - xA, dy = yB - yA;
    const distSq = dx * dx + dy * dy;
    const minDist = rA + rB;

    if (distSq >= minDist * minDist) return;

    const dist = Math.sqrt(distSq) || 0.0001;
    const overlap = minDist - dist;
    const depth = Math.max(overlap - CollisionBoxSystem.PENETRATION_SLOP, 0) *
                  CollisionBoxSystem.PENETRATION_CORRECTION_RATIO;
    if (depth <= 0) return;

    const nx = dx / dist, ny = dy / dist;
    const pushX = nx * depth, pushY = ny * depth;

    // Infer mass from size (area ~ r²)
    const massA = rA * rA;
    const massB = rB * rB;
    const totalMass = massA + massB || 1;

    const moveA = massB / totalMass;
    const moveB = massA / totalMass;

    const shipA = ShipRegistry.getInstance().getByNumericId(store.shipNumericId[idxA]) as CompositeBlockObject | null;
    const shipB = ShipRegistry.getInstance().getByNumericId(store.shipNumericId[idxB]) as CompositeBlockObject | null;
    if (!shipA || !shipB) return;

    const tA = shipA.getTransform();
    const tB = shipB.getTransform();

    tA.position.x -= pushX * moveA;
    tA.position.y -= pushY * moveA;

    tB.position.x += pushX * moveB;
    tB.position.y += pushY * moveB;

    // This call doesn't seem to be necessary
    // shipA.updateBlockPositions();
    // shipB.updateBlockPositions();
  }
}
