// src/systems/collision/CollisionBoxSystem.ts

import { CollisionBoxManager } from '@/game/entities/collisionbox/CollisionBoxManager';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';

export class CollisionBoxSystem {
  private static readonly QUERY_RADIUS_FACTOR = 2.0;
  private static readonly PENETRATION_SLOP = 4;
  private static readonly PENETRATION_CORRECTION_RATIO = 0.5;
  private static readonly MAX_QUERY_RADIUS = 1500;

  private readonly store = CollisionBoxManager.getInstance().getCollisionBoxStore();
  private readonly grid = CollisionBoxManager.getInstance().getBoxSpatialGrid();

  private readonly _candidateBuffer: Uint32Array;
  private readonly _shipRefs: (CompositeBlockObject | null)[];
  private readonly _radii: Float32Array;

  constructor(maxCandidates = 64, maxBoxes = 2048) {
    this._candidateBuffer = new Uint32Array(maxCandidates);
    this._shipRefs = new Array(maxBoxes);
    this._radii = new Float32Array(maxBoxes);
  }

  public update(dt: number): void {
    const { store, grid, _shipRefs, _radii } = this;
    const active = store.activeIndices;
    const count = store.activeCount;

    if (count <= 1) return;

    // Cache ship references and precompute radii to avoid repeated lookups and max() calls
    const registry = ShipRegistry.getInstance();
    for (let i = 0; i < count; i++) {
      const idx = active[i];
      _shipRefs[idx] = registry.getByNumericId(store.shipNumericId[idx]) as CompositeBlockObject | null;
      _radii[idx] = Math.max(store.halfWidth[idx], store.halfHeight[idx]);
    }

    for (let i = 0; i < count; i++) {
      const idxA = active[i];
      const xA = store.worldX[idxA];
      const yA = store.worldY[idxA];
      const rA = _radii[idxA];

      const queryRadius = Math.min(
        rA * CollisionBoxSystem.QUERY_RADIUS_FACTOR,
        CollisionBoxSystem.MAX_QUERY_RADIUS
      );

      const candidateCount = grid.getBoxesInArea(xA, yA, queryRadius, this._candidateBuffer);

      for (let j = 0; j < candidateCount; j++) {
        const idxB = this._candidateBuffer[j];
        if (idxB <= idxA) continue;

        this.resolvePair(idxA, idxB, _shipRefs, _radii);
      }
    }
  }

  private resolvePair(
    idxA: number,
    idxB: number,
    shipRefs: (CompositeBlockObject | null)[],
    radii: Float32Array
  ): void {
    const { store } = this;

    const xA = store.worldX[idxA], yA = store.worldY[idxA];
    const xB = store.worldX[idxB], yB = store.worldY[idxB];

    const rA = radii[idxA];
    const rB = radii[idxB];

    const dx = xB - xA, dy = yB - yA;
    const distSq = dx * dx + dy * dy;

    // Precompute sum of radii squared for early rejection
    const rSum = rA + rB;
    const rSumSq = rSum * rSum;

    // Skip entirely if the boxes' circles don't overlap
    if (distSq >= rSumSq) return;

    // Definite overlap — compute penetration details
    const dist = distSq > 0 ? Math.sqrt(distSq) : 0.0001;
    const overlap = rSum - dist;

    // Apply slop threshold before normalization
    const rawDepth = overlap - CollisionBoxSystem.PENETRATION_SLOP;
    if (rawDepth <= 0) return;

    const depth = rawDepth * CollisionBoxSystem.PENETRATION_CORRECTION_RATIO;

    // Normalize direction
    const invDist = 1 / dist;
    const nx = dx * invDist;
    const ny = dy * invDist;

    const pushX = nx * depth;
    const pushY = ny * depth;

    // Mass weighting by area
    const massA = rA * rA;
    const massB = rB * rB;
    const totalMass = massA + massB || 1;

    const moveA = massB / totalMass;
    const moveB = massA / totalMass;

    const shipA = shipRefs[idxA];
    const shipB = shipRefs[idxB];
    if (!shipA || !shipB) return;

    const tA = shipA.getTransform();
    const tB = shipB.getTransform();

    tA.position.x -= pushX * moveA;
    tA.position.y -= pushY * moveA;

    tB.position.x += pushX * moveB;
    tB.position.y += pushY * moveB;
  }
}
