// src/systems/physics/ProjectileSystem.ts

import type { Projectile } from '@/game/interfaces/types/Projectile';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ParticleManager } from '@/systems/fx/ParticleManager';

import { BlockManager } from '@/game/blocks/system/BlockManager';
import type { BlockStore } from '@/game/blocks/system/BlockStore';
import type { BlockSpatialGrid } from '@/game/blocks/system/BlockSpatialGrid';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import { CompositeBlockObjectRegistry } from '@/game/entities/registries/CompositeBlockObjectRegistry';

import { INDEX_TO_PROJECTILE_TYPE } from '@/systems/physics/interfaces/ProjectileTypes';
import { Faction } from '@/game/interfaces/types/Faction';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { createProjectileSOA, type ProjectileSOA } from '@/systems/physics/interfaces/ProjectileSOA';

export class ProjectileSystem {
  private soa: ProjectileSOA;
  private pendingSoa: ProjectileSOA;
  private hitSetPool: Set<string>[] = [];
  private hitSets: Map<number, Set<string>> = new Map(); // Maps hitSetIndex to actual Set
  private nextHitSetIndex = 0;

  private store: BlockStore;
  private spatialGrid: BlockSpatialGrid;

  constructor(
    private readonly combatService: CombatService,
    private readonly particleManager: ParticleManager,
    maxProjectiles = 8192,
  ) {
    this.store = BlockManager.getInstance().getBlockStore();
    this.spatialGrid = BlockManager.getInstance().getBlockSpatialGrid();
    this.soa = createProjectileSOA(maxProjectiles);
    this.pendingSoa = createProjectileSOA(maxProjectiles);
  }

  private acquireHitSet(): { set: Set<string>; index: number } {
    const set = this.hitSetPool.pop() ?? new Set();
    const index = this.nextHitSetIndex++;
    this.hitSets.set(index, set);
    return { set, index };
  }

  private releaseHitSet(index: number): void {
    const set = this.hitSets.get(index);
    if (set) {
      set.clear();
      this.hitSetPool.push(set);
      this.hitSets.delete(index);
    }
  }

  spawnProjectile(
    origin: { x: number; y: number },
    target: { x: number; y: number },
    type: number,
    damage: number,
    speed = 300,
    lifetime = 2,
    accuracy = 1,
    ownerShipId: number,
    ownerFaction: number,
    particleColors?: string[],
    fadeMode?: 'linear' | 'delayed',
  ): Projectile | undefined {
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return;

    let angle = Math.atan2(dy, dx);
    const spreadRange = (1 - accuracy) * Math.PI / 8;
    if (accuracy < 1) {
      angle += (Math.random() * 2 - 1) * spreadRange;
    }

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    return this.emitProjectile(
      origin,
      { x: vx, y: vy },
      type,
      damage,
      lifetime,
      ownerShipId,
      ownerFaction,
      particleColors,
      fadeMode
    );
  }

  spawnProjectileWithVelocity(
    origin: { x: number; y: number },
    velocity: { x: number; y: number },
    type: number,
    damage: number,
    lifetime = 2,
    _accuracy = 1,
    ownerShipId: number,
    ownerFaction: number,
    particleColors?: string[],
    fadeMode?: 'linear' | 'delayed',
    split = false,
    penetrate = false,
  ): Projectile {
    return this.emitProjectile(
      origin,
      velocity,
      type,
      damage,
      lifetime,
      ownerShipId,
      ownerFaction,
      particleColors,
      fadeMode,
      split,
      penetrate,
    );
  }

  private emitProjectile(
    origin: { x: number; y: number },
    velocity: { x: number; y: number },
    type: number,
    damage: number,
    lifetime: number,
    ownerShipId: number,
    ownerFaction: number,
    particleColors?: string[],
    fadeMode?: 'linear' | 'delayed',
    split = false,
    penetrate = false,
  ): Projectile {
    if (this.soa.count >= this.soa.x.length) {
      throw new Error('ProjectileSOA buffer overflow');
    }

    const lightColorOverride = ownerFaction === 1 ? '#ff0000' : undefined;

    const ship = ShipRegistry.getInstance().getByNumericId(ownerShipId);
    if (ship?.getFaction() === Faction.Enemy) {
      const affixes = ship?.getAffixes() ?? {};
      velocity.x *= affixes.projectileSpeedMulti ?? 1;
      velocity.y *= affixes.projectileSpeedMulti ?? 1;
      lifetime *= affixes.projectileLifetimeMulti ?? 1;
    }

    const particleHandle = this.particleManager.emitParticleWithHandle(origin, {
      colors: particleColors ?? ['#ffff88', '#ffaa00', '#ffcc33'],
      baseSpeed: 0,
      sizeRange: [2.2, 2.8],
      lifeRange: [lifetime, lifetime + 0.1],
      velocity,
      light: true,
      lightRadiusScalar: 20,
      lightIntensity: 0.8,
      fadeMode,
      lightColorOverride,
    });

    const { set: hitSet, index: hitSetIndex } = this.acquireHitSet();
    const projectileIndex = this.soa.count;

    // Write to SOA arrays
    this.soa.x[projectileIndex] = origin.x;
    this.soa.y[projectileIndex] = origin.y;
    this.soa.vx[projectileIndex] = velocity.x;
    this.soa.vy[projectileIndex] = velocity.y;
    this.soa.damage[projectileIndex] = damage;
    this.soa.life[projectileIndex] = lifetime;
    this.soa.typeIndex[projectileIndex] = type;
    this.soa.faction[projectileIndex] = ownerFaction;
    this.soa.ownerShipId[projectileIndex] = ownerShipId;

    // Cache shooter ship reference for fast collision resolution
    this.soa.ownerShipRef[projectileIndex] = ship ?? null;

    this.soa.split[projectileIndex] = split ? 1 : 0;
    this.soa.penetrate[projectileIndex] = penetrate ? 1 : 0;
    this.soa.particleHandle[projectileIndex] = particleHandle;
    this.soa.hitSetIndex[projectileIndex] = hitSetIndex;

    this.soa.count++;

    // Return compatibility object
    return {
      position: { x: origin.x, y: origin.y },
      velocity: { x: velocity.x, y: velocity.y },
      type,
      damage,
      life: lifetime,
      ownerShipId,
      ownerFaction,
      split,
      penetrate,
      hitShipIds: hitSet,
    };
  }

  update(dt: number) {
    // Update all projectiles in SOA
    for (let i = 0; i < this.soa.count; i++) {
      this.soa.x[i] += this.soa.vx[i] * dt;
      this.soa.y[i] += this.soa.vy[i] * dt;
      this.soa.life[i] -= dt;
    }

    // Remove dead projectiles (compact array)
    this.compactDeadProjectiles();
    this.checkCollisions();

    // Integrate pending projectiles
    if (this.pendingSoa.count > 0) {
      this.integrateePendingProjectiles();
    }
  }

  private compactDeadProjectiles(): void {
    let writeIndex = 0;
    
    for (let readIndex = 0; readIndex < this.soa.count; readIndex++) {
      if (this.soa.life[readIndex] > 0) {
        if (writeIndex !== readIndex) {
          this.copyProjectile(readIndex, writeIndex);
        }
        writeIndex++;
      } else {
        // Release resources for dead projectile
        this.particleManager.killParticle(this.soa.particleHandle[readIndex]);
        this.releaseHitSet(this.soa.hitSetIndex[readIndex]);
        this.soa.ownerShipRef[readIndex] = null;
      }
    }

    this.soa.count = writeIndex;
  }

  private copyProjectile(fromIndex: number, toIndex: number): void {
    this.soa.x[toIndex] = this.soa.x[fromIndex];
    this.soa.y[toIndex] = this.soa.y[fromIndex];
    this.soa.vx[toIndex] = this.soa.vx[fromIndex];
    this.soa.vy[toIndex] = this.soa.vy[fromIndex];
    this.soa.damage[toIndex] = this.soa.damage[fromIndex];
    this.soa.life[toIndex] = this.soa.life[fromIndex];
    this.soa.typeIndex[toIndex] = this.soa.typeIndex[fromIndex];
    this.soa.faction[toIndex] = this.soa.faction[fromIndex];
    this.soa.ownerShipId[toIndex] = this.soa.ownerShipId[fromIndex];
    this.soa.ownerShipRef[toIndex] = this.soa.ownerShipRef[fromIndex];
    this.soa.split[toIndex] = this.soa.split[fromIndex];
    this.soa.penetrate[toIndex] = this.soa.penetrate[fromIndex];
    this.soa.particleHandle[toIndex] = this.soa.particleHandle[fromIndex];
    this.soa.hitSetIndex[toIndex] = this.soa.hitSetIndex[fromIndex];
  }

  private integrateePendingProjectiles(): void {
    const spaceAvailable = this.soa.x.length - this.soa.count;
    const toIntegrate = Math.min(this.pendingSoa.count, spaceAvailable);

    for (let i = 0; i < toIntegrate; i++) {
      const targetIndex = this.soa.count + i;
      this.copyProjectileFromPending(i, targetIndex);
    }

    this.soa.count += toIntegrate;

    // Compact pending array if we integrated some but not all
    if (toIntegrate < this.pendingSoa.count) {
      for (let i = 0; i < this.pendingSoa.count - toIntegrate; i++) {
        this.copyPendingProjectile(toIntegrate + i, i);
      }
    }

    this.pendingSoa.count -= toIntegrate;
  }

  private copyProjectileFromPending(fromIndex: number, toIndex: number): void {
    this.soa.x[toIndex] = this.pendingSoa.x[fromIndex];
    this.soa.y[toIndex] = this.pendingSoa.y[fromIndex];
    this.soa.vx[toIndex] = this.pendingSoa.vx[fromIndex];
    this.soa.vy[toIndex] = this.pendingSoa.vy[fromIndex];
    this.soa.damage[toIndex] = this.pendingSoa.damage[fromIndex];
    this.soa.life[toIndex] = this.pendingSoa.life[fromIndex];
    this.soa.typeIndex[toIndex] = this.pendingSoa.typeIndex[fromIndex];
    this.soa.faction[toIndex] = this.pendingSoa.faction[fromIndex];
    this.soa.ownerShipId[toIndex] = this.pendingSoa.ownerShipId[fromIndex];
    this.soa.ownerShipRef[toIndex] = this.pendingSoa.ownerShipRef[fromIndex]; // NEW
    this.soa.split[toIndex] = this.pendingSoa.split[fromIndex];
    this.soa.penetrate[toIndex] = this.pendingSoa.penetrate[fromIndex];
    this.soa.particleHandle[toIndex] = this.pendingSoa.particleHandle[fromIndex];
    this.soa.hitSetIndex[toIndex] = this.pendingSoa.hitSetIndex[fromIndex];
  }

  private copyPendingProjectile(fromIndex: number, toIndex: number): void {
    this.pendingSoa.x[toIndex] = this.pendingSoa.x[fromIndex];
    this.pendingSoa.y[toIndex] = this.pendingSoa.y[fromIndex];
    this.pendingSoa.vx[toIndex] = this.pendingSoa.vx[fromIndex];
    this.pendingSoa.vy[toIndex] = this.pendingSoa.vy[fromIndex];
    this.pendingSoa.damage[toIndex] = this.pendingSoa.damage[fromIndex];
    this.pendingSoa.life[toIndex] = this.pendingSoa.life[fromIndex];
    this.pendingSoa.typeIndex[toIndex] = this.pendingSoa.typeIndex[fromIndex];
    this.pendingSoa.faction[toIndex] = this.pendingSoa.faction[fromIndex];
    this.pendingSoa.ownerShipId[toIndex] = this.pendingSoa.ownerShipId[fromIndex];
    this.pendingSoa.ownerShipRef[toIndex] = this.pendingSoa.ownerShipRef[fromIndex]; // NEW
    this.pendingSoa.split[toIndex] = this.pendingSoa.split[fromIndex];
    this.pendingSoa.penetrate[toIndex] = this.pendingSoa.penetrate[fromIndex];
    this.pendingSoa.particleHandle[toIndex] = this.pendingSoa.particleHandle[fromIndex];
    this.pendingSoa.hitSetIndex[toIndex] = this.pendingSoa.hitSetIndex[fromIndex];
  }

  private checkCollisions(): void {
    const store = this.store;
    const spatialGrid = this.spatialGrid;
    const scratchCoord = { x: 0, y: 0 }; // Reused object for GC neutrality

    for (let i = this.soa.count - 1; i >= 0; i--) {
      const size = 32;
      const x = this.soa.x[i];
      const y = this.soa.y[i];

      const shooterShip = this.soa.ownerShipRef[i];
      if (!shooterShip) {
        continue; // Skip projectiles whose owner ship no longer exists
      }

      const blocks = spatialGrid.getBlocksInArea(x - size, y - size, x + size, y + size);
      let shouldRemove = false;

      for (let b = 0; b < blocks.length; b++) {
        const blockIdx = blocks[b];
        const shipId = store.ownerShipId[blockIdx];

        // Skip self-hits
        if (shipId === this.soa.ownerShipId[i]) {
          continue;
        }

        // Try resolving the owning object (ship, asteroid, station, etc.)
        let ownerObj: CompositeBlockObject | undefined =
          ShipRegistry.getInstance().getByNumericId(shipId) as CompositeBlockObject | undefined;

        if (!ownerObj) {
          ownerObj = CompositeBlockObjectRegistry.getInstance().getByNumericId(shipId);
        }
        if (!ownerObj || ownerObj.isNoClip()) {
          continue;
        }

        // Narrow-phase collision test
        if (!this.checkCollisionAtIndex(i, blockIdx)) {
          continue;
        }

        // Validate hit set
        const hitSet = this.hitSets.get(this.soa.hitSetIndex[i]);
        if (!hitSet) {
          this.removeProjectileAtIndex(i);
          break;
        }

        // Skip duplicate hits on the same object
        if (hitSet.has(ownerObj.id)) {
          continue;
        }
        hitSet.add(ownerObj.id);

        // Use scratchCoord (local grid coords) for damage calculation
        scratchCoord.x = store.localX[blockIdx];
        scratchCoord.y = store.localY[blockIdx];

        // Apply damage
        this.combatService.applyDamageToBlock(
          ownerObj,
          shooterShip,
          blockIdx,
          scratchCoord,
          this.soa.damage[i],
          INDEX_TO_PROJECTILE_TYPE[this.soa.typeIndex[i]] as 'turret' | 'projectile'
        );

        // Handle projectile lifecycle (penetration/split logic)
        if (this.soa.penetrate[i] !== 1) {
          if (this.soa.split[i] === 1) {
            this.handleSplitProjectile(i, ownerObj.id);
          }
          shouldRemove = true;
          break;
        }
      }

      if (shouldRemove) {
        this.removeProjectileAtIndex(i);
      }
    }
  }

  private handleSplitProjectile(index: number, hitObjectId: string): void {
    const remainingLife = this.soa.life[index];
    const baseAngle = Math.random() * 2 * Math.PI;
    const speed = Math.hypot(this.soa.vx[index] * 1.5, this.soa.vy[index] * 1.5);

    const angles = [
      baseAngle,
      baseAngle + (2 * Math.PI) / 3,
      baseAngle + (4 * Math.PI) / 3,
    ];

    const { set: sharedHitSet, index: sharedHitSetIndex } = this.acquireHitSet();
    sharedHitSet.add(hitObjectId);

    for (const angle of angles) {
      const velocity = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      };
      this.emitSplitProjectileToPending(index, velocity, remainingLife, sharedHitSetIndex);
    }
  }

  private emitSplitProjectileToPending(
    parentIndex: number,
    velocity: { x: number; y: number },
    life: number,
    inheritedHitSetIndex: number
  ): void {
    if (this.pendingSoa.count >= this.pendingSoa.x.length) {
      return; // Skip if pending buffer is full
    }

    const origin = { x: this.soa.x[parentIndex], y: this.soa.y[parentIndex] };

    const particleHandle = this.particleManager.emitParticleWithHandle(origin, {
      colors: ['#ff88cc', '#ffaaee', '#ff66bb'],
      baseSpeed: 0,
      sizeRange: [1.8, 2.4],
      lifeRange: [life, life + 0.1],
      velocity,
      light: true,
      lightRadiusScalar: 15,
      lightIntensity: 0.6,
      fadeMode: 'linear',
    });

    const targetIndex = this.pendingSoa.count;

    // Copy scalar fields from parent projectile
    this.pendingSoa.x[targetIndex] = origin.x;
    this.pendingSoa.y[targetIndex] = origin.y;
    this.pendingSoa.vx[targetIndex] = velocity.x;
    this.pendingSoa.vy[targetIndex] = velocity.y;
    this.pendingSoa.damage[targetIndex] = this.soa.damage[parentIndex] * 0.75;
    this.pendingSoa.life[targetIndex] = life;
    this.pendingSoa.typeIndex[targetIndex] = this.soa.typeIndex[parentIndex];
    this.pendingSoa.faction[targetIndex] = this.soa.faction[parentIndex];
    this.pendingSoa.ownerShipId[targetIndex] = this.soa.ownerShipId[parentIndex];

    // Also cache the shooter reference from parent, for collision attribution
    this.pendingSoa.ownerShipRef[targetIndex] = this.soa.ownerShipRef[parentIndex];

    this.pendingSoa.split[targetIndex] = 0; // No nested splits
    this.pendingSoa.penetrate[targetIndex] = this.soa.penetrate[parentIndex];
    this.pendingSoa.particleHandle[targetIndex] = particleHandle;
    this.pendingSoa.hitSetIndex[targetIndex] = inheritedHitSetIndex;

    this.pendingSoa.count++;
  }

  private checkCollisionAtIndex(index: number, blockIdx: number): boolean {
    const store = this.store;

    // Retrieve world-space position directly from BlockStore
    const bx = store.worldX[blockIdx];
    const by = store.worldY[blockIdx];

    // Determine block size using its type index
    const blockSize = 32;

    // Compute Euclidean distance between projectile and block center
    const dx = this.soa.x[index] - bx;
    const dy = this.soa.y[index] - by;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const projectileRadius = 15;
    return dist < (projectileRadius + blockSize / 2);
  }

  private removeProjectileAtIndex(index: number): void {
    // Release FX and hit set
    this.particleManager.killParticle(this.soa.particleHandle[index]);
    this.releaseHitSet(this.soa.hitSetIndex[index]);

    const lastIndex = this.soa.count - 1;

    // If not the last, overwrite this slot with the last projectile
    if (index !== lastIndex) {
      this.copyProjectile(lastIndex, index); // already copies ownerShipRef
    }

    // Clear reference from the last slot to avoid leaks
    this.soa.ownerShipRef[lastIndex] = null;

    this.soa.count--;
  }

  destroy(): void {
    // Clean up all active projectiles
    for (let i = 0; i < this.soa.count; i++) {
      this.particleManager.killParticle(this.soa.particleHandle[i]);
      this.releaseHitSet(this.soa.hitSetIndex[i]);
    }

    // Clean up pending projectiles
    for (let i = 0; i < this.pendingSoa.count; i++) {
      this.particleManager.killParticle(this.pendingSoa.particleHandle[i]);
      this.releaseHitSet(this.pendingSoa.hitSetIndex[i]);
    }

    this.soa.count = 0;
    this.pendingSoa.count = 0;

    // Clear all hit sets
    for (const set of this.hitSetPool) {
      set.clear();
    }
    this.hitSetPool.length = 0;
    this.hitSets.clear();
    this.nextHitSetIndex = 0;
  }
}
