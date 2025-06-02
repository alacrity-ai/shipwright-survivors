// src/systems/physics/ProjectileSystem.ts

import type { Projectile } from '@/game/interfaces/types/Projectile';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { Particle } from '@/systems/fx/interfaces/Particle';
import { findShipByBlock, findBlockCoordinatesInShip } from '@/game/ship/utils/shipBlockUtils';
import type { CanvasManager } from '@/core/CanvasManager';
import type { Grid } from '@/systems/physics/Grid';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { Ship } from '@/game/ship/Ship';

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
    private readonly playerShip: Ship
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
    particleColors?: string[]
  ) {
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

    // Emit exactly one visual particle to represent the projectile being fired
    const particle = this.particleManager.emitParticle(origin, {
      colors: particleColors ?? ['#ffff88', '#ffaa00', '#ffcc33'],
      baseSpeed: 0,
      sizeRange: [3.2, 3.2],
      lifeRange: [lifetime, lifetime + 0.1], // tightly synced
      velocity: { x: vx, y: vy },
    });

    this.projectiles.push({
      position: { x: origin.x, y: origin.y },
      velocity: { x: vx, y: vy },
      type,
      damage,
      life: lifetime,
      ownerShipId,
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

  private checkCollisions() {
    for (const p of this.projectiles) {
      const relevantCells = this.grid.getRelevantCells(p.position);

      for (const cell of relevantCells) {
        const blocks = this.grid.getBlocksInCellByCoords(cell.x, cell.y);

        for (const block of blocks) {
          if (block.ownerShipId === p.ownerShipId) continue;
          if (this.checkCollision(p, block)) {
            const ship = findShipByBlock(block);
            if (ship) {
              const coord = findBlockCoordinatesInShip(block, ship);
              if (coord) {
                this.combatService.applyDamageToBlock(ship, block, coord, p.damage, 'projectile', this.playerShip);
              }
              this.removeProjectile(p);
              return;
            }
          }
        }
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

    return distance < (projectileRadius + blockSize / 2);
  }

  private removeProjectile(projectile: VisualizedProjectile) {
    this.projectiles = this.projectiles.filter(p => p !== projectile);
    this.particleManager.removeParticle(projectile.particle);
  }
}
