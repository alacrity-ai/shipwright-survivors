// src/systems/physics/ProjectileSystem.ts

import type { Projectile } from '@/game/interfaces/types/Projectile';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { Ship } from '@/game/ship/Ship';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import { getProjectileSprite } from '@/rendering/cache/ProjectileSpriteCache';
import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';
import { ShipCullingSystem } from '@/game/ship/systems/ShipCullingSystem';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { Grid } from '@/systems/physics/Grid';  // Import the Grid
import { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import { ScreenEffectsSystem } from '@/systems/fx/ScreenEffectsSystem';
import { getConnectedBlockCoords } from '@/game/ship/utils/shipBlockUtils';

import { PickupSpawner } from '@/systems/pickups/PickupSpawner'; // Import PickupSpawner
import { PickupSystem } from '@/systems/pickups/PickupSystem'; // Assuming the PickupSystem is available

export class ProjectileSystem {
  private projectiles: Projectile[] = [];
  private ctx: CanvasRenderingContext2D;
  private grid: Grid; // Instance of the Grid class
  private pickupSpawner: PickupSpawner;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly camera: Camera,
    private readonly shipCulling: ShipCullingSystem,
    grid: Grid, // Inject Grid instance into ProjectileSystem
    private readonly explosionSystem: ExplosionSystem,
    private readonly screenEffects: ScreenEffectsSystem,
    private readonly pickupSystem: PickupSystem // Inject PickupSystem
  ) {
    this.ctx = canvasManager.getContext('fx');
    this.grid = grid;  // Initialize the grid
    this.pickupSpawner = new PickupSpawner(this.pickupSystem);  // Initialize PickupSpawner
  }

  spawnProjectile(
    origin: { x: number; y: number },
    target: { x: number; y: number },
    type: string,
    damage: number,
    speed: number = 300,
    lifetime: number = 2,
    accuracy: number = 1,
    ownerShipId: string
  ) {
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return;

    let angle = Math.atan2(dy, dx);

    const spreadRange = (1 - accuracy) * Math.PI / 8;
    if (accuracy < 1) {
      const spread = (Math.random() * 2 - 1) * spreadRange;
      angle += spread;
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
          // Skip blocks owned by the projectile's owner
          if (block.ownerShipId === p.ownerShipId) continue;

          // Check collision between projectile and block
          if (this.checkCollision(p, block)) {
            // Find which ship owns this block
            const ship = this.findShipByBlock(block);
            if (ship) {
              this.applyDamageToBlock(p, block, ship);
              this.removeProjectile(p); // Remove the projectile after collision
              return; // Exit early after first collision
            }
          }
        }
      }
    }
  }

  // This method finds the ship based on the block's ownerShipId
  private findShipByBlock(block: BlockInstance): Ship | null {
    // Get all active ships, not just AI ships
    const registry = ShipRegistry.getInstance();
    const allShips = Array.from(registry.getAll());
    
    return allShips.find(ship => ship.id === block.ownerShipId) || null;
  }

  checkCollision(projectile: Projectile, block: BlockInstance): boolean {
    if (!block.position) return false;

    // Increase projectile radius for better hit detection
    const projectileRadius = 15;  // Was 10
    const blockSize = block.type.size || 32;

    const dx = projectile.position.x - block.position.x;
    const dy = projectile.position.y - block.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Add debug visualization for collisions
    if (distance < (projectileRadius + blockSize / 2)) {
      return true;
    }
    return false;
  }

  applyDamageToBlock(projectile: Projectile, block: BlockInstance, ship: Ship) {
    // Apply damage to the specific block that was hit
    block.hp -= projectile.damage;

    // Create a small impact explosion
    if (block.position) {
      this.explosionSystem.createExplosion(
        block.position,
        20, // Impact explosion size
        0.3  // Duration
      );
    }

    if (block.hp <= 0) {
      const blockCoord = this.findBlockCoordinatesInShip(block, ship);
      if (!blockCoord) {
        console.error('Could not find block coordinates in ship');
        return;
      }

      // Create a larger explosion for block destruction
      this.explosionSystem.createBlockExplosion(
        ship.getTransform().position,
        ship.getTransform().rotation,
        blockCoord,
        70,
        0.7
      );

      ship.removeBlock(blockCoord);
      this.pickupSpawner.spawnPickupOnBlockDestruction(block);

      // === Cockpit logic ===
      if (block.type.id === 'cockpit') {
        this.destroyShip(ship);
        return;
      }

      // === Identify disconnected blocks ===
      const cockpitCoord = ship.getCockpitCoord?.();
      if (!cockpitCoord) {
        console.warn('Ship has no cockpit coordinate');
        return;
      }

      const connectedSet = getConnectedBlockCoords(ship, cockpitCoord);
      const serialize = (c: GridCoord) => `${c.x},${c.y}`;

      for (const [coord, orphanBlock] of ship.getAllBlocks()) {
        if (!connectedSet.has(serialize(coord))) {
          this.explosionSystem.createBlockExplosion(
            ship.getTransform().position,
            ship.getTransform().rotation,
            coord,
            60 + Math.random() * 20,
            0.5 + Math.random() * 0.3
          );
          this.pickupSpawner.spawnPickupOnBlockDestruction(orphanBlock);
          ship.removeBlock(coord);
        }
      }
    }
  }

  // Helper method to find a block's coordinates within a ship
  private findBlockCoordinatesInShip(targetBlock: BlockInstance, ship: Ship): GridCoord | null {
    const allBlocks = ship.getAllBlocks();
    for (const [coord, block] of allBlocks) {
      if (block === targetBlock) {
        return coord;
      }
    }
    return null;
  }

  destroyShip(ship: Ship) {
    // Create multiple explosions across the ship
    const transform = ship.getTransform();
    const blocks = ship.getAllBlocks();
    
    // Create a major screen flash for ship destruction
    this.screenEffects.createExplosionFlash(0.4);
    
    // Create explosions for each block with random timing
    blocks.forEach(([coord, block], index) => {
      setTimeout(() => {
        this.explosionSystem.createBlockExplosion(
          transform.position,
          transform.rotation,
          coord,
          50 + Math.random() * 40,
          0.5 + Math.random() * 0.5
        );

        // NEW: ensure every block gets a pickup chance
        this.pickupSpawner.spawnPickupOnBlockDestruction(block);

        // Optional: remove block from ship after explosion
        ship.removeBlock(coord); // <- if not already handled by ShipRegistry
      }, index * 50);
    });
    
    // 1. Remove any AI controllers for this ship
    AIOrchestratorSystem.removeControllersForShip(ship.id);
    
    // 2. Remove the ship from the registry
    const registry = ShipRegistry.getInstance();
    registry.remove(ship);
  }

  removeProjectile(projectile: Projectile) {
    this.projectiles = this.projectiles.filter(p => p !== projectile);  // Remove projectile after collision
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
