// // src/systems/combat/backends/FlameThrowerBackend.ts

// import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
// import type { Ship } from '@/game/ship/Ship';
// import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
// import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
// import type { CombatService } from '@/systems/combat/CombatService';
// import type { ParticleManager } from '@/systems/fx/ParticleManager';

// import { FLAMETHROWER_TIER_COLORS } from '@/game/blocks/BlockColorSchemes';
// import { emitDefaultFlames } from '@/core/interfaces/events/SpecialFxReporter';
// import { ShipGrid } from '@/game/ship/ShipGrid';
// import { Faction } from '@/game/interfaces/types/Faction';

// interface ActiveFlameProjectile {
//   position: { x: number; y: number };
//   velocity: { x: number; y: number };
//   damage: number;
//   ttl: number;
//   age: number;
//   ownerShipId: string;
//   firingBlockId: string;
//   ownerFaction: Faction;
//   color: string;
// }

// // TODO:
// /*
// Improvements:
// 1) Increase DOT Intensity per number of flamethrower blocks, also tier should play a factor here as well, since each tier's damage is higher

// 2) Set a total visual flame emission budget, so that when we have 4+ flame turrets we aren't completely filling up the screen with overlapping flames.
// Once we're hitting the budget, make sure to evenly distribute the flames across all flame turrets
// */

// const MAX_SPREAD_ANGLE = (30 * Math.PI) / 180; // ±30° fan spread
// const IGNITE_DURATION = 8.0;                   // ignite duration in seconds
// const PROJECTILE_RADIUS = 92;                  // collision approximation
// const BLOCK_SIZE = 32;

// export class FlameThrowerBackend implements WeaponBackend {
//   private activeFlames: ActiveFlameProjectile[] = [];
//   private readonly shipGrid = ShipGrid.getInstance();

//   constructor(
//     private readonly combatService: CombatService,
//     private readonly particleManager: ParticleManager
//   ) {}

//   update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void {
//     const plan = ship.getFiringPlan().filter(p => p.block.type.behavior?.fire?.fireType === 'flameThrower');
//     if (plan.length === 0 || !intent?.firePrimary || !intent.aimAt) return;

//     const aimAt = intent.aimAt;
//     const dx = aimAt.x - transform.position.x;
//     const dy = aimAt.y - transform.position.y;
//     const baseAngle = Math.atan2(dy, dx);

//     const cos = Math.cos(transform.rotation);
//     const sin = Math.sin(transform.rotation);

//     for (const flame of plan) {
//       const fire = flame.block.type.behavior!.fire!;
//       flame.timeSinceLastShot += dt;
//       if (flame.timeSinceLastShot < (1.0 / (fire.fireRate ?? 8.0))) continue;
//       flame.timeSinceLastShot = 0;

//       const coord = flame.coord ?? ship.getBlockCoord(flame.block);
//       if (!coord) continue;

//       const localX = coord.x * BLOCK_SIZE;
//       const localY = coord.y * BLOCK_SIZE;
//       const worldX = transform.position.x + localX * cos - localY * sin;
//       const worldY = transform.position.y + localX * sin + localY * cos;

//       const angleOffset = (Math.random() - 0.5) * 2 * MAX_SPREAD_ANGLE;
//       const finalAngle = baseAngle + angleOffset;

//       const speed = fire.projectileSpeed ?? 700;
//       const vx = Math.cos(finalAngle) * speed;
//       const vy = Math.sin(finalAngle) * speed;
//       const ttl = fire.lifetime ?? 0.5;
//       const color = FLAMETHROWER_TIER_COLORS[flame.block.type.tier] ?? '#ff9933';

//       // --- "Real" projectile (with logic + light) ---
//       emitDefaultFlames(worldX, worldY, fire.radius ?? 50, ttl, true, 4, color, vx, vy);
//       this.activeFlames.push({
//         position: { x: worldX, y: worldY },
//         velocity: { x: vx, y: vy },
//         damage: fire.fireDamage ?? 1,
//         ttl,
//         age: 0,
//         ownerShipId: ship.id,
//         firingBlockId: flame.block.type.id,
//         ownerFaction: ship.getFaction(),
//         color,
//       });

//       // --- Additional "hose" visuals (no light, no collision) ---
//       for (let i = 0; i < 2; i++) {
//         const sizeJitter = (fire.radius ?? 50) * (0.5 + Math.random() * 0.5);
//         const lifeJitter = ttl * (0.6 + Math.random() * 0.5);
//         const angleJitter = finalAngle + (Math.random() - 0.5) * 0.15; // slightly off-axis
//         const vjx = Math.cos(angleJitter) * (speed * 0.8);
//         const vjy = Math.sin(angleJitter) * (speed * 0.8);

//         emitDefaultFlames(
//           worldX,
//           worldY,
//           sizeJitter,
//           lifeJitter,
//           false, // no light for visual-only particles
//           3,
//           color,
//           vjx,
//           vjy
//         );
//       }
//     }

//     this.updateFlames(dt, ship);
//   }

//   private updateFlames(dt: number, ownerShip: Ship): void {
//     const expired = new Set<ActiveFlameProjectile>();

//     for (const flame of this.activeFlames) {
//       flame.age += dt;
//       if (flame.age > flame.ttl) {
//         expired.add(flame);
//         continue;
//       }

//       // Move flame
//       flame.position.x += flame.velocity.x * dt;
//       flame.position.y += flame.velocity.y * dt;

//       // Broad-phase: nearby ships
//       const minX = flame.position.x - PROJECTILE_RADIUS;
//       const minY = flame.position.y - PROJECTILE_RADIUS;
//       const maxX = flame.position.x + PROJECTILE_RADIUS;
//       const maxY = flame.position.y + PROJECTILE_RADIUS;

//       const ships = this.shipGrid.getShipsInArea(minX, minY, maxX, maxY, flame.ownerFaction);

//       for (const target of ships) {
//         if (target.getFaction() === flame.ownerFaction || target.isDestroyed()) continue;

//         for (const [coord, block] of target.getAllBlocks()) {
//           if (!block.position) continue;

//           const dx = flame.position.x - block.position.x;
//           const dy = flame.position.y - block.position.y;
//           if (dx * dx + dy * dy < PROJECTILE_RADIUS * PROJECTILE_RADIUS) {
//             target.addStatusEffect('ignite', IGNITE_DURATION, ownerShip, flame.damage);
//             this.combatService.applyDamageToBlock(target, ownerShip, block, coord, flame.damage, 'dot');
//             expired.add(flame);
//             break;
//           }
//         }
//       }
//     }

//     this.activeFlames = this.activeFlames.filter(f => !expired.has(f));
//   }

//   render(dt: number): void {
//     // handled visually via emitDefaultFlames
//   }
// }


// src/systems/combat/backends/FlameThrowerBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ParticleManager } from '@/systems/fx/ParticleManager';

import { FLAMETHROWER_TIER_COLORS } from '@/game/blocks/BlockColorSchemes';
import { emitDefaultFlames } from '@/core/interfaces/events/SpecialFxReporter';
import { ShipGrid } from '@/game/ship/ShipGrid';
import { Faction } from '@/game/interfaces/types/Faction';

interface ActiveFlameProjectile {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  damage: number;
  ttl: number;
  age: number;
  ownerShipId: string;
  firingBlockId: string;
  ownerFaction: Faction;
  color: string;
}

const MAX_SPREAD_ANGLE = (30 * Math.PI) / 180;
const IGNITE_DURATION = 8.0;
const PROJECTILE_RADIUS = 92;
const BLOCK_SIZE = 32;

// --- New constants for TODOs ---
const MAX_VISUAL_FLAMES_PER_FRAME = 20; // Global flame particle cap
const DOT_BASE_DAMAGE = 1;              // Base damage multiplier per block
const DOT_TIER_BONUS = 0.5;             // Extra per-tier scaling

export class FlameThrowerBackend implements WeaponBackend {
  private activeFlames: ActiveFlameProjectile[] = [];
  private readonly shipGrid = ShipGrid.getInstance();

  constructor(
    private readonly combatService: CombatService,
    private readonly particleManager: ParticleManager
  ) {}

  update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void {
    const plan = ship.getFiringPlan().filter(p => p.block.type.behavior?.fire?.fireType === 'flameThrower');
    if (plan.length === 0 || !intent?.firePrimary || !intent.aimAt) return;

    const aimAt = intent.aimAt;
    const dx = aimAt.x - transform.position.x;
    const dy = aimAt.y - transform.position.y;
    const baseAngle = Math.atan2(dy, dx);

    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);

    // --- DOT Scaling: scale all flames based on block count and tier sum ---
    const blockCount = plan.length;
    const avgTier = plan.reduce((sum, p) => sum + (p.block.type.tier ?? 0), 0) / blockCount;
    const dotMultiplier = DOT_BASE_DAMAGE * blockCount + DOT_TIER_BONUS * avgTier;

    // --- Visual emission budget per turret ---
    const visualFlamesPerTurret = Math.max(1, Math.floor(MAX_VISUAL_FLAMES_PER_FRAME / plan.length));

    for (const flame of plan) {
      const fire = flame.block.type.behavior!.fire!;
      flame.timeSinceLastShot += dt;
      if (flame.timeSinceLastShot < (1.0 / (fire.fireRate ?? 8.0))) continue;
      flame.timeSinceLastShot = 0;

      const coord = flame.coord ?? ship.getBlockCoord(flame.block);
      if (!coord) continue;

      const localX = coord.x * BLOCK_SIZE;
      const localY = coord.y * BLOCK_SIZE;
      const worldX = transform.position.x + localX * cos - localY * sin;
      const worldY = transform.position.y + localX * sin + localY * cos;

      const angleOffset = (Math.random() - 0.5) * 2 * MAX_SPREAD_ANGLE;
      const finalAngle = baseAngle + angleOffset;

      const speed = fire.projectileSpeed ?? 700;
      const vx = Math.cos(finalAngle) * speed;
      const vy = Math.sin(finalAngle) * speed;
      const ttl = fire.lifetime ?? 0.5;
      const color = FLAMETHROWER_TIER_COLORS[flame.block.type.tier] ?? '#ff9933';

      // Main projectile (has logic + light)
      emitDefaultFlames(worldX, worldY, fire.radius ?? 50, ttl, true, 4, color, vx, vy);
      this.activeFlames.push({
        position: { x: worldX, y: worldY },
        velocity: { x: vx, y: vy },
        damage: (fire.fireDamage ?? 1) * dotMultiplier, // scaled damage
        ttl,
        age: 0,
        ownerShipId: ship.id,
        firingBlockId: flame.block.type.id,
        ownerFaction: ship.getFaction(),
        color,
      });

      // Visual-only hose effects, capped globally
      for (let i = 0; i < visualFlamesPerTurret; i++) {
        const sizeJitter = (fire.radius ?? 50) * (0.5 + Math.random() * 0.5);
        const lifeJitter = ttl * (0.6 + Math.random() * 0.5);
        const angleJitter = finalAngle + (Math.random() - 0.5) * 0.15;
        const vjx = Math.cos(angleJitter) * (speed * 0.8);
        const vjy = Math.sin(angleJitter) * (speed * 0.8);

        emitDefaultFlames(
          worldX,
          worldY,
          sizeJitter,
          lifeJitter,
          false,
          3,
          color,
          vjx,
          vjy
        );
      }
    }

    this.updateFlames(dt, ship);
  }

  private updateFlames(dt: number, ownerShip: Ship): void {
    const expired = new Set<ActiveFlameProjectile>();

    for (const flame of this.activeFlames) {
      flame.age += dt;
      if (flame.age > flame.ttl) {
        expired.add(flame);
        continue;
      }

      flame.position.x += flame.velocity.x * dt;
      flame.position.y += flame.velocity.y * dt;

      const minX = flame.position.x - PROJECTILE_RADIUS;
      const minY = flame.position.y - PROJECTILE_RADIUS;
      const maxX = flame.position.x + PROJECTILE_RADIUS;
      const maxY = flame.position.y + PROJECTILE_RADIUS;

      const ships = this.shipGrid.getShipsInArea(minX, minY, maxX, maxY, flame.ownerFaction);

      for (const target of ships) {
        if (target.getFaction() === flame.ownerFaction || target.isDestroyed()) continue;

        for (const [coord, block] of target.getAllBlocks()) {
          if (!block.position) continue;

          const dx = flame.position.x - block.position.x;
          const dy = flame.position.y - block.position.y;
          if (dx * dx + dy * dy < PROJECTILE_RADIUS * PROJECTILE_RADIUS) {
            target.addStatusEffect('ignite', IGNITE_DURATION, ownerShip, flame.damage);
            this.combatService.applyDamageToBlock(target, ownerShip, block, coord, flame.damage, 'dot');
            expired.add(flame);
            break;
          }
        }
      }
    }

    this.activeFlames = this.activeFlames.filter(f => !expired.has(f));
  }

  render(dt: number): void {
    // Visuals handled by emitDefaultFlames
  }
}
