// src/systems/physics/ProjectileSystem.ts

import type { Projectile } from '@/game/interfaces/types/Projectile';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';

import { findShipByBlock, findBlockCoordinatesInShip } from '@/game/ship/utils/shipBlockUtils';

import { getProjectileSprite } from '@/rendering/cache/ProjectileSpriteCache';
import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';
import { Grid } from '@/systems/physics/Grid';
import { CombatService } from '@/systems/combat/CombatService'; // NEW

export class ProjectileSystem {
  private projectiles: Projectile[] = [];
  private ctx: CanvasRenderingContext2D;

  constructor(
    canvasManager: CanvasManager,
    private readonly camera: Camera,
    private readonly grid: Grid,
    private readonly combatService: CombatService,
  ) {
    this.ctx = canvasManager.getContext('fx');
  }

  spawnProjectile(
    origin: { x: number; y: number },
    target: { x: number; y: number },
    type: string,
    damage: number,
    speed = 300,
    lifetime = 2,
    accuracy = 1,
    ownerShipId: string
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

    this.projectiles.push({
      position: { x: origin.x, y: origin.y },
      velocity: { x: vx, y: vy },
      type,
      damage,
      life: lifetime,
      ownerShipId,
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

  checkCollisions() {
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
                this.combatService.applyDamageToBlock(ship, block, coord, p.damage, 'projectile');
              }
              this.removeProjectile(p);
              return;
            }
          }
        }
      }
    }
  }

  checkCollision(projectile: Projectile, block: BlockInstance): boolean {
    if (!block.position) return false;

    const projectileRadius = 15;
    const blockSize = block.type.size || 32;
    const dx = projectile.position.x - block.position.x;
    const dy = projectile.position.y - block.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < (projectileRadius + blockSize / 2);
  }

  removeProjectile(projectile: Projectile) {
    this.projectiles = this.projectiles.filter(p => p !== projectile);
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.scale(this.camera.zoom, this.camera.zoom);

    for (const p of this.projectiles) {
      const screen = this.camera.worldToScreen(p.position.x, p.position.y);
      const sprite = getProjectileSprite(p.type);
      const size = sprite.width;

      ctx.drawImage(
        sprite,
        screen.x / this.camera.zoom - size / 2,
        screen.y / this.camera.zoom - size / 2,
        size,
        size
      );
    }

    ctx.restore();
  }
}
