// src/systems/physics/BlockObjectCollisionSystem.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { CombatService } from '@/systems/combat/CombatService';
import type { BlockStore } from '@/game/blocks/system/BlockStore';
import { getAffixesSafe } from '@/game/ship/utils/getAffixesSafe';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { CompositeBlockObjectRegistry } from '@/game/entities/registries/CompositeBlockObjectRegistry';

import { getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';
import { BlockManager } from '@/game/blocks/system/BlockManager';

interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Vec2 {
  x: number;
  y: number;
}

interface BlockCacheEntry {
  idx: number;
  localX: number;
  localY: number;
}

export class BlockObjectCollisionSystem {
  private static readonly BLOCK_SIZE = 32;
  private static readonly PENETRATION_SLOP = 4;
  private static readonly PENETRATION_CORRECTION_RATIO = 0.4;
  private static readonly RESTITUTION = 0.2;
  private static readonly IMPULSE_EPSILON = 0.05;
  private static readonly MAX_OVERLAP_PAIRS = 10;

  // Block cache - stores full block data when needed
  private _blockCache = new Map<CompositeBlockObject, BlockCacheEntry[]>();
  
  // Index-only cache for AABB computation
  private _indexCache = new Map<CompositeBlockObject, Uint32Array>();
  
  private readonly _seenOwnerIds: Float64Array;

  private readonly _damageBuffer: {
    target: CompositeBlockObject;
    source: CompositeBlockObject;
    idx: number;
    x: number;
    y: number;
    amount: number;
  }[] = [];

  private readonly _scratchAABB: AABB = { x: 0, y: 0, width: 0, height: 0 };
  private readonly _scratchAABB2: AABB = { x: 0, y: 0, width: 0, height: 0 };
  private readonly _scratchCoord: Vec2 = { x: 0, y: 0 };
  private readonly _scratchCoord2: Vec2 = { x: 0, y: 0 };
  
  // Reusable array for nearby objects (avoid Set allocation)
  private readonly _nearbyObjectsBuffer: CompositeBlockObject[] = [];

  private readonly store: BlockStore;

  constructor(private readonly combatService: CombatService) {
    this.store = BlockManager.getInstance().getBlockStore();

    // Assume a reasonable max number of objects (expandable if needed)
    const MAX_OWNER_IDS = 8192; 
    this._seenOwnerIds = new Float64Array(MAX_OWNER_IDS);
  }

  public resolveCollisions(movingObject: CompositeBlockObject): void {
    this._blockCache.clear();
    this._indexCache.clear();

    const nearbyObjects = this.getNearbyObjects(movingObject);
    for (const otherObject of nearbyObjects) {
      if (!this.aabbOverlap(movingObject, otherObject)) continue;
      if (!otherObject.isConstructed() || otherObject.isNoClip()) continue;

      movingObject.setColliding(true);
      otherObject.setColliding(true);

      this.applyCollisionDamage(movingObject, otherObject);

      const msv = this.computeMinimumSeparationVector(movingObject, otherObject);
      if (!msv) continue;

      this.resolvePenetration(movingObject, otherObject, msv);
      this.resolveImpulse(movingObject, otherObject, msv);
    }
  }

  private getCachedBlocks(obj: CompositeBlockObject): BlockCacheEntry[] {
    const cached = this._blockCache.get(obj);
    if (cached) return cached;

    const indices = obj.getAllBlockIndices();
    const store = this.store;
    const result: BlockCacheEntry[] = [];

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      result.push({
        idx,
        localX: store.localX[idx],
        localY: store.localY[idx],
      });
    }

    this._blockCache.set(obj, result);
    return result;
  }

  private getCachedIndices(obj: CompositeBlockObject): Uint32Array {
    const cached = this._indexCache.get(obj);
    if (cached) return cached;

    const indices = obj.getAllBlockIndices();
    this._indexCache.set(obj, indices);
    return indices;
  }

  public clearCache(): void {
    this._blockCache.clear();
    this._indexCache.clear();
  }

  private getNearbyObjects(target: CompositeBlockObject): CompositeBlockObject[] {
    // Reset dedup list per frame (just reset length, don’t fill array)
    let seenCount = 0;

    // Compute target AABB
    this.computeAABBInPlace(target, this._scratchAABB);

    const grid = target.getGrid();
    const nearbyIndices = grid.getBlocksInArea(
      this._scratchAABB.x,
      this._scratchAABB.y,
      this._scratchAABB.x + this._scratchAABB.width,
      this._scratchAABB.y + this._scratchAABB.height
    );

    const store = this.store;
    this._nearbyObjectsBuffer.length = 0;

    scan: for (let i = 0; i < nearbyIndices.length; i++) {
      const idx = nearbyIndices[i];
      const ownerId = store.ownerShipId[idx];
      if (ownerId === target.numericId) continue;

      // Deduplicate via linear search (safe even for 64-bit IDs)
      for (let j = 0; j < seenCount; j++) {
        if (this._seenOwnerIds[j] === ownerId) {
          continue scan; // Already seen
        }
      }

      // Add new owner
      this._seenOwnerIds[seenCount++] = ownerId;

      // Resolve object
      let obj = ShipRegistry.getInstance().getByNumericId(ownerId) as CompositeBlockObject | undefined;
      if (!obj) {
        obj = CompositeBlockObjectRegistry.getInstance().getByNumericId(ownerId);
      }
      if (obj) {
        this._nearbyObjectsBuffer.push(obj);
      }
    }

    return this._nearbyObjectsBuffer;
  }

  private aabbOverlap(a: CompositeBlockObject, b: CompositeBlockObject): boolean {
    // Compute AABBs for both objects into scratch slots
    this.computeAABBInPlace(a, this._scratchAABB);
    this.computeAABBInPlace(b, this._scratchAABB2);

    const aBox = this._scratchAABB;
    const bBox = this._scratchAABB2;

    return !(
      aBox.x + aBox.width < bBox.x ||
      aBox.x > bBox.x + bBox.width ||
      aBox.y + aBox.height < bBox.y ||
      aBox.y > bBox.y + bBox.height
    );
  }

  private computeAABBInPlace(obj: CompositeBlockObject, result: AABB): void {
    const indices = this.getCachedIndices(obj);
    const store = this.store;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const x = store.worldX[idx];
      const y = store.worldY[idx];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    result.x = minX;
    result.y = minY;
    result.width = maxX - minX + BlockObjectCollisionSystem.BLOCK_SIZE;
    result.height = maxY - minY + BlockObjectCollisionSystem.BLOCK_SIZE;
  }

  private computeMinimumSeparationVector(
    a: CompositeBlockObject,
    b: CompositeBlockObject
  ): { x: number; y: number } | null {
    const store = this.store;
    const blocksA = this.getCachedBlocks(a);
    const blocksB = this.getCachedBlocks(b);

    let overlapCount = 0;
    let dx = 0, dy = 0;

    // Process overlaps directly without building array
    outer: for (let i = 0; i < blocksA.length; i++) {
      const idxA = blocksA[i].idx;
      const worldXA = store.worldX[idxA];
      const worldYA = store.worldY[idxA];

      for (let j = 0; j < blocksB.length; j++) {
        const idxB = blocksB[j].idx;
        const worldXB = store.worldX[idxB];
        const worldYB = store.worldY[idxB];

        if (this.blocksOverlapDirect(worldXA, worldYA, worldXB, worldYB)) {
          dx += worldXA - worldXB;
          dy += worldYA - worldYB;
          overlapCount++;
          
          if (overlapCount >= BlockObjectCollisionSystem.MAX_OVERLAP_PAIRS) {
            break outer;
          }
        }
      }
    }

    if (overlapCount === 0) return null;

    dx /= overlapCount;
    dy /= overlapCount;

    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return null;

    const rawDepth = BlockObjectCollisionSystem.BLOCK_SIZE / 2;
    const slop = BlockObjectCollisionSystem.PENETRATION_SLOP;
    const correctionRatio = BlockObjectCollisionSystem.PENETRATION_CORRECTION_RATIO;
    const correctedDepth = Math.max(rawDepth - slop, 0) * correctionRatio;

    return {
      x: (dx / mag) * correctedDepth,
      y: (dy / mag) * correctedDepth,
    };
  }

  private blocksOverlapDirect(x1: number, y1: number, x2: number, y2: number): boolean {
    const size = BlockObjectCollisionSystem.BLOCK_SIZE;
    return (
      Math.abs(x1 - x2) < size &&
      Math.abs(y1 - y2) < size
    );
  }

  private resolvePenetration(
    a: CompositeBlockObject,
    b: CompositeBlockObject,
    msv: { x: number; y: number }
  ): void {
    const immovableA = a.isImmoveable?.() ?? false;
    const immovableB = b.isImmoveable?.() ?? false;

    const tA = a.getTransform();
    const tB = b.getTransform();

    if (immovableA && immovableB) {
      return;
    } else if (immovableA) {
      tB.position.x -= msv.x;
      tB.position.y -= msv.y;
      b.updateBlockPositions();
    } else if (immovableB) {
      tA.position.x += msv.x;
      tA.position.y += msv.y;
      a.updateBlockPositions();
    } else {
      const massA = a.getTotalMass();
      const massB = b.getTotalMass();
      const totalMass = massA + massB || 1;

      const moveA = massB / totalMass;
      const moveB = massA / totalMass;

      tA.position.x += msv.x * moveA;
      tA.position.y += msv.y * moveA;

      tB.position.x -= msv.x * moveB;
      tB.position.y -= msv.y * moveB;

      a.updateBlockPositions();
      b.updateBlockPositions();
    }
  }

  private resolveImpulse(
    a: CompositeBlockObject,
    b: CompositeBlockObject,
    normal: { x: number; y: number }
  ): void {
    const immovableA = a.isImmoveable?.() ?? false;
    const immovableB = b.isImmoveable?.() ?? false;

    const tA = a.getTransform();
    const tB = b.getTransform();

    const vA = tA.velocity;
    const vB = tB.velocity;

    const relVx = vA.x - vB.x;
    const relVy = vA.y - vB.y;

    const dot = relVx * normal.x + relVy * normal.y;
    if (dot >= 0) return;

    const massA = a.getTotalMass();
    const massB = b.getTotalMass();
    const totalMass = massA + massB || 1;

    const restitution = BlockObjectCollisionSystem.RESTITUTION;
    const maxRelativeSpeed = 200;
    const clampedDot = Math.max(dot, -maxRelativeSpeed);
    const impulseMag = (-(1 + restitution) * clampedDot) / totalMass;

    if (Math.abs(impulseMag) < BlockObjectCollisionSystem.IMPULSE_EPSILON) return;

    const impulseX = impulseMag * normal.x;
    const impulseY = impulseMag * normal.y;

    const damping = 0.95;

    if (immovableA && immovableB) {
      return;
    } else if (immovableA) {
      vB.x += impulseX;
      vB.y += impulseY;
      vB.x *= damping;
      vB.y *= damping;
    } else if (immovableB) {
      vA.x -= impulseX;
      vA.y -= impulseY;
      vA.x *= damping;
      vA.y *= damping;
    } else {
      vA.x -= (impulseX * massB) / totalMass;
      vA.y -= (impulseY * massB) / totalMass;
      vB.x += (impulseX * massA) / totalMass;
      vB.y += (impulseY * massA) / totalMass;

      vA.x *= damping;
      vA.y *= damping;
      vB.x *= damping;
      vB.y *= damping;
    }
  }

  private applyCollisionDamage(a: CompositeBlockObject, b: CompositeBlockObject): void {
    const relativeVelocity = this.computeRelativeVelocity(a, b);
    const speed = Math.sqrt(relativeVelocity.x * relativeVelocity.x + relativeVelocity.y * relativeVelocity.y);

    // Early out if relative speed is too low
    const minDamageSpeed = 70;
    if (speed < minDamageSpeed) return;

    // Precompute base damage scaling
    const softCapSpeed = 1500;
    const maxDamage = 50;
    const clampedSpeed = Math.min(speed, softCapSpeed);
    const normalized = (clampedSpeed - minDamageSpeed) / (softCapSpeed - minDamageSpeed);
    const baseDamage = Math.pow(normalized, 1.35) * maxDamage;

    const store = this.store;
    const blocksA = this.getCachedBlocks(a);
    const blocksB = this.getCachedBlocks(b);

    // Cache affixes once
    const affixesA = getAffixesSafe(a) ?? {};
    const affixesB = getAffixesSafe(b) ?? {};

    let blocksDamaged = 0;
    const MAX_BLOCK_DAMAGE = 10;

    this._damageBuffer.length = 0;

    outer: for (let i = 0; i < blocksA.length; i++) {
      const { idx: idxA, localX: localXA, localY: localYA } = blocksA[i];
      const worldXA = store.worldX[idxA];
      const worldYA = store.worldY[idxA];
      const typeA = getBlockTypeByIndex(store.typeIndex[idxA]);
      const behaviorA = typeA?.behavior ?? {};

      for (let j = 0; j < blocksB.length; j++) {
        const { idx: idxB, localX: localXB, localY: localYB } = blocksB[j];
        const worldXB = store.worldX[idxB];
        const worldYB = store.worldY[idxB];
        const typeB = getBlockTypeByIndex(store.typeIndex[idxB]);
        const behaviorB = typeB?.behavior ?? {};

        if (!this.blocksOverlapDirect(worldXA, worldYA, worldXB, worldYB)) continue;

        // Precompute multipliers
        const damageMultiplierA = behaviorA.rammingDamageMultiplier ?? 1;
        const damageMultiplierB = behaviorB.rammingDamageMultiplier ?? 1;

        const baseArmorA = behaviorA.rammingArmor ?? 0;
        const baseArmorB = behaviorB.rammingArmor ?? 0;

        const effectiveArmorA = baseArmorA * (affixesA.rammingArmorMultiplier ?? 1);
        const effectiveArmorB = baseArmorB * (affixesB.rammingArmorMultiplier ?? 1);

        const inflictMultiplierA = affixesA.rammingDamageInflictMultiplier ?? 1;
        const inflictMultiplierB = affixesB.rammingDamageInflictMultiplier ?? 1;

        const damageToB = Math.max(0, baseDamage * damageMultiplierA * inflictMultiplierA - effectiveArmorB);
        const damageToA = Math.max(0, baseDamage * damageMultiplierB * inflictMultiplierB - effectiveArmorA);

        // Queue both hits
        this._damageBuffer.push({ target: b, source: a, idx: idxB, x: localXB, y: localYB, amount: damageToB });
        this._damageBuffer.push({ target: a, source: b, idx: idxA, x: localXA, y: localYA, amount: damageToA });

        blocksDamaged += 2;
        if (blocksDamaged >= MAX_BLOCK_DAMAGE) break outer;
      }
    }

    // Flush queued damage
    for (let i = 0; i < this._damageBuffer.length; i++) {
      const d = this._damageBuffer[i];
      this._scratchCoord.x = d.x;
      this._scratchCoord.y = d.y;
      this.combatService.applyDamageToBlock(d.target, d.source, d.idx, this._scratchCoord, d.amount, 'collision');
    }
  }

  private computeRelativeVelocity(
    a: CompositeBlockObject,
    b: CompositeBlockObject
  ): { x: number; y: number } {
    const vA = a.getTransform().velocity;
    const vB = b.getTransform().velocity;

    return {
      x: vA.x - vB.x,
      y: vA.y - vB.y,
    };
  }
}
