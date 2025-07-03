// src/systems/physics/ProjectileSystem.ts

import type { Projectile } from '@/game/interfaces/types/Projectile';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { CanvasManager } from '@/core/CanvasManager';
import type { Grid } from '@/systems/physics/Grid';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ParticleManager } from '@/systems/fx/ParticleManager';

import { Faction } from '@/game/interfaces/types/Faction';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { BlockToObjectIndex } from '@/game/blocks/BlockToObjectIndexRegistry';

interface VisualizedProjectile extends Projectile {
  particle: Particle;
}

export class ProjectileSystem {
  private projectiles: VisualizedProjectile[] = [];
  private pendingProjectiles: VisualizedProjectile[] = [];
  private hitSetPool: Set<string>[] = [];

  constructor(
    _canvasManager: CanvasManager, // retained for compatibility
    private readonly grid: Grid,
    private readonly combatService: CombatService,
    private readonly particleManager: ParticleManager,
  ) {}

  private acquireHitSet(): Set<string> {
    return this.hitSetPool.pop() ?? new Set();
  }

  private releaseHitSet(set: Set<string>): void {
    set.clear();
    this.hitSetPool.push(set);
  }

  spawnProjectile(
    origin: { x: number; y: number },
    target: { x: number; y: number },
    type: string,
    damage: number,
    speed = 300,
    lifetime = 2,
    accuracy = 1,
    ownerShipId: string,
    ownerFaction: Faction,
    particleColors?: string[],
    fadeMode?: 'linear' | 'delayed',
  ): void {
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

    this.emitProjectile(
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
    type: string,
    damage: number,
    lifetime = 2,
    _accuracy = 1,
    ownerShipId: string,
    ownerFaction: Faction,
    particleColors?: string[],
    fadeMode?: 'linear' | 'delayed',
    split = false,
    penetrate = false,
  ): void {
    this.emitProjectile(
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
    type: string,
    damage: number,
    lifetime: number,
    ownerShipId: string,
    ownerFaction: Faction,
    particleColors?: string[],
    fadeMode?: 'linear' | 'delayed',
    split = false,
    penetrate = false,
  ): void {

    const lightColorOverride = ownerFaction === Faction.Enemy ? '#ff0000' : undefined;

    const ship = ShipRegistry.getInstance().getById(ownerShipId);
    if (ship?.getFaction() === Faction.Enemy) {
      const affixes = ship?.getAffixes() ?? {};
      velocity.x *= affixes.projectileSpeedMulti ?? 1;
      velocity.y *= affixes.projectileSpeedMulti ?? 1;
    }

    const particle = this.particleManager.emitParticle(origin, {
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

    this.projectiles.push({
      position: { x: origin.x, y: origin.y },
      velocity: { x: velocity.x, y: velocity.y },
      type,
      damage,
      life: lifetime,
      ownerShipId,
      ownerFaction,
      split,
      penetrate,
      hitShipIds: this.acquireHitSet(),
      particle,
    });
  }

  update(dt: number) {
    for (const p of this.projectiles) {
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.life -= dt;
    }

    this.projectiles = this.projectiles.filter(p => p.life > 0);
    this.checkCollisions();

    // Integrate any new projectiles emitted during collision
    if (this.pendingProjectiles.length > 0) {
      this.projectiles.push(...this.pendingProjectiles);
      this.pendingProjectiles.length = 0;
    }
  }

  private checkCollisions(): void {
    const toRemove = new Set<VisualizedProjectile>();

    for (const p of this.projectiles) {
      const size = 32;

      const blocks = this.grid.getBlocksInArea(
        p.position.x - size,
        p.position.y - size,
        p.position.x + size,
        p.position.y + size,
        p.ownerFaction
      );

      for (const block of blocks) {
        if (!this.checkCollision(p, block)) continue;

        const obj = BlockToObjectIndex.getObject(block);
        if (!obj) continue;

        const coord = obj.getBlockCoord(block);
        if (!coord) continue;

        const ownerShipInstance = ShipRegistry.getInstance().getById(p.ownerShipId);
        if (!ownerShipInstance) continue;

        if (p.hitShipIds.has(obj.id)) continue;

        // Record the hit BEFORE applying damage
        p.hitShipIds.add(obj.id);

        // Apply damage
        this.combatService.applyDamageToBlock(
          obj,
          ownerShipInstance,
          block,
          coord,
          p.damage,
          p.type as 'turret' | 'projectile',
        );

        if (p.penetrate) {
          break; // continue checking for additional targets this frame
        } else {
          if (p.split) {
            const remainingLife = p.life;

            // Base random angle
            const baseAngle = Math.random() * 2 * Math.PI;

            // Compute speed based on original velocity, amplify as before
            const speed = Math.hypot(p.velocity.x * 1.5, p.velocity.y * 1.5);

            // Generate 3 evenly spaced angles: base, base + 120°, base + 240°
            const angles = [
              baseAngle,
              baseAngle + (2 * Math.PI) / 3, // +120°
              baseAngle + (4 * Math.PI) / 3, // +240°
            ];

            // Acquire shared hitSet so all split projectiles track the same initial hit
            const hitSet = this.acquireHitSet();
            hitSet.add(obj.id);

            // Emit three split projectiles
            for (const angle of angles) {
              const velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed,
              };
              this.emitSplitProjectile(p.position, velocity, p, remainingLife, hitSet);
            }
          }

          toRemove.add(p);
          break; // stop processing this projectile after hit
        }
      }
    }

    for (const p of toRemove) {
      this.removeProjectile(p);
    }
  }

  private emitSplitProjectile(
    origin: { x: number; y: number },
    velocity: { x: number; y: number },
    parent: Projectile,
    life: number,
    inheritedHitIds: Set<string>
  ): void {
    const particle = this.particleManager.emitParticle(origin, {
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

    const hitSet = this.acquireHitSet();
    for (const hitId of inheritedHitIds) {
      hitSet.add(hitId);
    }

    this.pendingProjectiles.push({
      position: { x: origin.x, y: origin.y },
      velocity: { x: velocity.x, y: velocity.y },
      type: parent.type,
      damage: parent.damage * 0.75,
      life,
      ownerShipId: parent.ownerShipId,
      ownerFaction: parent.ownerFaction,
      particle,
      split: false,
      penetrate: parent.penetrate,
      hitShipIds: hitSet,
    });
  }

  private checkCollision(projectile: Projectile, block: BlockInstance): boolean {
    if (!block.position) return false;

    const projectileRadius = 15;
    const blockSize = block.type.size || 32;
    const dx = projectile.position.x - block.position.x;
    const dy = projectile.position.y - block.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < (projectileRadius + blockSize / 2);
  }

  private removeProjectile(projectile: VisualizedProjectile) {
    this.projectiles = this.projectiles.filter(p => p !== projectile);
    this.particleManager.removeParticle(projectile.particle);
    this.releaseHitSet(projectile.hitShipIds);
  }

  destroy(): void {
    this.projectiles.length = 0;
    this.pendingProjectiles.length = 0;

    for (const set of this.hitSetPool) {
      set.clear(); // just in case
    }

    this.hitSetPool.length = 0;
  }
}