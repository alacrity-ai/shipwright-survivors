// src/systems/physics/ProjectileSystem.ts

import type { Projectile } from '@/game/interfaces/types/Projectile';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { CanvasManager } from '@/core/CanvasManager';
import type { Grid } from '@/systems/physics/Grid';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { Ship } from '@/game/ship/Ship';
import type { Faction } from '@/game/interfaces/types/Faction';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { BlockToObjectIndex } from '@/game/blocks/BlockToObjectIndexRegistry';

interface VisualizedProjectile extends Projectile {
  particle: Particle;
}

export class ProjectileSystem {
  private projectiles: VisualizedProjectile[] = [];

  constructor(
    _canvasManager: CanvasManager, // retained for compatibility
    private readonly grid: Grid,
    private readonly combatService: CombatService,
    private readonly particleManager: ParticleManager,
  ) {}

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
    _accuracy = 1, // ignored here, already baked into velocity
    ownerShipId: string,
    ownerFaction: Faction,
    particleColors?: string[],
    fadeMode?: 'linear' | 'delayed',
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
      fadeMode
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
  ): void {
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
    });

    this.projectiles.push({
      position: { x: origin.x, y: origin.y },
      velocity: { x: velocity.x, y: velocity.y },
      type,
      damage,
      life: lifetime,
      ownerShipId,
      ownerFaction,
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
  }

  private checkCollisions(): void {
    for (const p of this.projectiles) {
      const size = 32; // radius of projectile check area

      // Only retrieve blocks from *opposing* factions
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

        this.combatService.applyDamageToBlock(
          obj,
          ownerShipInstance,
          block,
          coord,
          p.damage,
          'projectile',
        );

        this.removeProjectile(p);
        return;
      }
    }
  }

  private checkCollision(projectile: Projectile, block: BlockInstance): boolean {
    if (!block.position) return false;

    const projectileRadius = 15;
    const blockSize = block.type.size || 32;
    const dx = projectile.position.x - block.position.x;
    const dy = projectile.position.y - block.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const inRange = distance < (projectileRadius + blockSize / 2);
    return inRange;
  }

  private removeProjectile(projectile: VisualizedProjectile) {
    this.projectiles = this.projectiles.filter(p => p !== projectile);
    this.particleManager.removeParticle(projectile.particle);
  }
}
