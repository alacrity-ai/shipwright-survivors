// src/systems/physics/BlockObjectCollisionSystem.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { CombatService } from '@/systems/combat/CombatService';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import { getAffixesSafe } from '@/game/ship/utils/getAffixesSafe';

import { getWorldPositionFromObjectCoord } from '@/game/entities/utils/universalBlockInterfaceUtils';
import { BlockToObjectIndex } from '@/game/blocks/BlockToObjectIndexRegistry';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class BlockObjectCollisionSystem {
  private static readonly BLOCK_SIZE = 32;
  private static readonly PENETRATION_SLOP = 4; // pixels allowed to overlap before correction
  private static readonly PENETRATION_CORRECTION_RATIO = 0.4; // percent of MSV to resolve per frame
  private static readonly RESTITUTION = 0.2; // 0 = inelastic, 1 = elastic
  private static readonly IMPULSE_EPSILON = 0.05; // minimum impulse magnitude to apply
  private static readonly MAX_OVERLAP_PAIRS = 10;

  private _blockCache = new Map<CompositeBlockObject, [coord: { x: number; y: number }, block: BlockInstance][]>();


  constructor(private readonly combatService: CombatService) {}

  public resolveCollisions(movingObject: CompositeBlockObject): void {
    if (!PlayerSettingsManager.getInstance().isCollisionsEnabled()) return;

    this._blockCache.clear(); // Critical to ensure per-frame freshness

    const nearbyObjects = this.getNearbyObjects(movingObject);
    for (const otherObject of nearbyObjects) {
      if (!this.aabbOverlap(movingObject, otherObject)) continue;

      movingObject.setColliding(true);
      otherObject.setColliding(true);

      this.applyCollisionDamage(movingObject, otherObject);

      const msv = this.computeMinimumSeparationVector(movingObject, otherObject);
      if (!msv) continue;

      this.resolvePenetration(movingObject, otherObject, msv);
      this.resolveImpulse(movingObject, otherObject, msv);
    }
  }

  private getCachedBlocks(obj: CompositeBlockObject): [coord: { x: number; y: number }, block: BlockInstance][] {
    const cached = this._blockCache.get(obj);
    if (cached) return cached;

    const blocks = Array.from(obj.getAllBlocks());
    this._blockCache.set(obj, blocks);
    return blocks;
  }

  private getNearbyObjects(target: CompositeBlockObject): CompositeBlockObject[] {
    const aabb = this.computeAABB(target);

    const nearbyBlocks = target.getGrid().getBlocksInArea(
      aabb.x,
      aabb.y,
      aabb.x + aabb.width,
      aabb.y + aabb.height
    );

    const nearbyObjects = new Set<CompositeBlockObject>();

    for (const block of nearbyBlocks) {
      const obj = BlockToObjectIndex.getObject(block);
      if (obj && obj !== target) {
        nearbyObjects.add(obj);
      }
    }

    return Array.from(nearbyObjects);
  }

  private aabbOverlap(a: CompositeBlockObject, b: CompositeBlockObject): boolean {
    const aBox = this.computeAABB(a);
    const bBox = this.computeAABB(b);
    return !(
      aBox.x + aBox.width < bBox.x ||
      aBox.x > bBox.x + bBox.width ||
      aBox.y + aBox.height < bBox.y ||
      aBox.y > bBox.y + bBox.height
    );
  }

  private computeAABB(obj: CompositeBlockObject): AABB {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const [coord] of this.getCachedBlocks(obj)) {
      const world = getWorldPositionFromObjectCoord(obj.getTransform(), coord);
      minX = Math.min(minX, world.x);
      maxX = Math.max(maxX, world.x);
      minY = Math.min(minY, world.y);
      maxY = Math.max(maxY, world.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + BlockObjectCollisionSystem.BLOCK_SIZE,
      height: maxY - minY + BlockObjectCollisionSystem.BLOCK_SIZE,
    };
  }

  private computeMinimumSeparationVector(
    a: CompositeBlockObject,
    b: CompositeBlockObject
  ): { x: number; y: number } | null {
    const overlapPairs: { a: { x: number; y: number }, b: { x: number; y: number } }[] = [];

    const transformA = a.getTransform();
    const transformB = b.getTransform();

    outer: for (const [coordA] of this.getCachedBlocks(a)) {
      const posA = getWorldPositionFromObjectCoord(transformA, coordA);

      for (const [coordB] of this.getCachedBlocks(b)) {
        const posB = getWorldPositionFromObjectCoord(transformB, coordB);

        if (this.blocksOverlap(posA, posB)) {
          overlapPairs.push({ a: posA, b: posB });
          if (overlapPairs.length >= BlockObjectCollisionSystem.MAX_OVERLAP_PAIRS) {
            break outer;
          }
        }
      }
    }

    if (overlapPairs.length === 0) return null;

    let dx = 0, dy = 0;
    for (const pair of overlapPairs) {
      dx += pair.a.x - pair.b.x;
      dy += pair.a.y - pair.b.y;
    }

    const n = overlapPairs.length;
    dx /= n;
    dy /= n;

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

  private blocksOverlap(posA: { x: number; y: number }, posB: { x: number; y: number }): boolean {
    const size = BlockObjectCollisionSystem.BLOCK_SIZE;
    return (
      Math.abs(posA.x - posB.x) < size &&
      Math.abs(posA.y - posB.y) < size
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
      // Both are immoveable; no resolution
      return;
    } else if (immovableA) {
      // A is fixed, push only B
      tB.position.x -= msv.x;
      tB.position.y -= msv.y;
      b.updateBlockPositions();
    } else if (immovableB) {
      // B is fixed, push only A
      tA.position.x += msv.x;
      tA.position.y += msv.y;
      a.updateBlockPositions();
    } else {
      // Both are movable; split displacement proportionally
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
      // Do nothing; both objects fixed
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
    const speed = Math.sqrt(relativeVelocity.x ** 2 + relativeVelocity.y ** 2);

    const minDamageSpeed = 70;
    const softCapSpeed = 1500;
    const maxDamage = 50;

    if (speed < minDamageSpeed) return;

    const clampedSpeed = Math.min(speed, softCapSpeed);
    const normalized = (clampedSpeed - minDamageSpeed) / (softCapSpeed - minDamageSpeed);
    const curveExponent = 1.35;
    const baseDamage = Math.pow(normalized, curveExponent) * maxDamage;

    let blocksDamaged = 0;
    const MAX_BLOCK_DAMAGE = 10;

    outer: for (const [coordA, blockA] of this.getCachedBlocks(a)) {
      const posA = getWorldPositionFromObjectCoord(a.getTransform(), coordA);

      for (const [coordB, blockB] of this.getCachedBlocks(b)) {
        const posB = getWorldPositionFromObjectCoord(b.getTransform(), coordB);

        if (!this.blocksOverlap(posA, posB)) continue;

        // === Lookup intrinsic behaviors ===
        const behaviorA = blockA.type.behavior ?? {};
        const behaviorB = blockB.type.behavior ?? {};

        const damageMultiplierA = behaviorA.rammingDamageMultiplier ?? 1;
        const damageMultiplierB = behaviorB.rammingDamageMultiplier ?? 1;

        const baseArmorA = behaviorA.rammingArmor ?? 0;
        const baseArmorB = behaviorB.rammingArmor ?? 0;

        // === Affix lookups ===
        const affixesA = getAffixesSafe(a) ?? {};
        const affixesB = getAffixesSafe(b) ?? {};

        const inflictMultiplierA = affixesA.rammingDamageInflictMultiplier ?? 1;
        const inflictMultiplierB = affixesB.rammingDamageInflictMultiplier ?? 1;

        const armorMultiplierA = affixesA.rammingArmorMultiplier ?? 1;
        const armorMultiplierB = affixesB.rammingArmorMultiplier ?? 1;

        const effectiveArmorA = baseArmorA * armorMultiplierA;
        const effectiveArmorB = baseArmorB * armorMultiplierB;

        // === Asymmetric application ===

        // Damage to B from A
        const rawToB = baseDamage * damageMultiplierA * inflictMultiplierA;
        const reducedToB = Math.max(0, rawToB - effectiveArmorB);
        this.combatService.applyDamageToBlock(b, a, blockB, coordB, reducedToB, 'collision', null);
        blocksDamaged++;
        if (blocksDamaged >= MAX_BLOCK_DAMAGE) break outer;

        // Damage to A from B
        const rawToA = baseDamage * damageMultiplierB * inflictMultiplierB;
        const reducedToA = Math.max(0, rawToA - effectiveArmorA);
        this.combatService.applyDamageToBlock(a, b, blockA, coordA, reducedToA, 'collision', null);
        blocksDamaged++;
        if (blocksDamaged >= MAX_BLOCK_DAMAGE) break outer;
      }
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
