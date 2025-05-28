// // src/systems/combat/WeaponSystem.ts

// import type { Ship } from '@/game/ship/Ship';
// import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
// import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
// import type { ShipTransform } from '@/systems/physics/MovementSystem';

// interface CooldownState {
//   turretCooldown: number;
//   turretIndex: number;
// }

// export class WeaponSystem {
//   private currentIntent: WeaponIntent | null = null;

//   // Automatically cleaned up when Ship references go out of scope
//   private cooldowns: WeakMap<Ship, CooldownState> = new WeakMap();

//   constructor(
//     private readonly projectileSystem: ProjectileSystem,
//   ) {}

//   public setIntent(intent: WeaponIntent): void {
//     this.currentIntent = intent;
//   }

//   public update(dt: number, ship: Ship, transform: ShipTransform): void {
//     try {
//       // First, check if the ship is valid
//       if (!ship || !transform) {
//         return;
//       }

//       if (!this.currentIntent || !this.currentIntent.firePrimary) {
//         this.resetCooldown(ship);
//         return;
//       }

//       // Get all the turret blocks that can fire
//       let allBlocks;
//       try {
//         allBlocks = ship.getAllBlocks();
//       } catch (error) {
//         console.error("Error getting blocks from ship:", error);
//         return;
//       }
      
//       // Add defensive check to handle undefined or empty blocks
//       if (!allBlocks || !Array.isArray(allBlocks) || allBlocks.length === 0) {
//         return;
//       }
      
//       // Filter turret blocks with additional safety checks
//       const turretBlocks = [];
//       for (const blockEntry of allBlocks) {
//         try {
//           if (!blockEntry || !Array.isArray(blockEntry) || blockEntry.length < 2) continue;
          
//           const [_coord, block] = blockEntry;
//           if (!block || !block.type) continue;
          
//           if (block.type.id.startsWith('turret') && 
//               block.type.behavior?.canFire && 
//               block.type.behavior.fire) {
//             turretBlocks.push(blockEntry);
//           }
//         } catch (error) {
//           console.error("Error processing block:", error);
//         }
//       }

//       if (turretBlocks.length === 0) return;

//       // Get fire behavior with safety checks
//       const firstTurret = turretBlocks[0][1];
//       if (!firstTurret || !firstTurret.type || !firstTurret.type.behavior || !firstTurret.type.behavior.fire) {
//         return;
//       }
      
//       const fire = firstTurret.type.behavior.fire;
//       const fireRate = fire.fireRate || 1;
//       const interval = 1 / fireRate / turretBlocks.length;

//       const cooldownState = this.getCooldownState(ship);

//       if (cooldownState.turretCooldown <= 0) {
//         // Make sure the turret index is valid
//         if (cooldownState.turretIndex >= turretBlocks.length) {
//           cooldownState.turretIndex = 0;
//         }
        
//         const [coord, _block] = turretBlocks[cooldownState.turretIndex];

//         // Advance round-robin turret firing index
//         cooldownState.turretIndex = (cooldownState.turretIndex + 1) % turretBlocks.length;
//         cooldownState.turretCooldown = interval;

//         // === Compute turret world position
//         const localX = coord.x * 32;
//         const localY = coord.y * 32;
//         const cos = Math.cos(transform.rotation);
//         const sin = Math.sin(transform.rotation);
//         const rotatedX = localX * cos - localY * sin;
//         const rotatedY = localX * sin + localY * cos;
//         const turretWorldX = transform.position.x + rotatedX;
//         const turretWorldY = transform.position.y + rotatedY;

//         const target = this.currentIntent.aimAt;
//         if (!target) return;

//         // === Fire projectile and associate with the correct ship via ownerShipId
//         this.projectileSystem.spawnProjectile(
//           { x: turretWorldX, y: turretWorldY },
//           target,
//           fire.fireType,
//           fire.fireDamage,
//           fire.projectileSpeed ?? 300,
//           fire.lifetime ?? 2,
//           fire.accuracy ?? 1,
//           ship.id  // Pass the ownerShipId (ship's unique ID) to track the projectile's origin
//         );
//       } else {
//         cooldownState.turretCooldown -= dt;
//       }
//     } catch (error) {
//       console.error("Unhandled error in WeaponSystem.update:", error);
//     }
//   }

//   private getCooldownState(ship: Ship): CooldownState {
//     let state = this.cooldowns.get(ship);
//     if (!state) {
//       state = { turretCooldown: 0, turretIndex: 0 };
//       this.cooldowns.set(ship, state);
//     }
//     return state;
//   }

//   private resetCooldown(ship: Ship): void {
//     const state = this.getCooldownState(ship);
//     state.turretCooldown = 0;
//     state.turretIndex = 0;
//   }
// }

// src/systems/combat/WeaponSystem.ts

import type { Ship } from '@/game/ship/Ship';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { ShipTransform } from '@/systems/physics/MovementSystem';

// Define the interface for pluggable weapon backends
export interface WeaponBackend {
  update(dt: number, ship: Ship, transform: ShipTransform, intent: WeaponIntent | null): void;
}

export class WeaponSystem {
  private currentIntent: WeaponIntent | null = null;
  private readonly backends: WeaponBackend[];

  constructor(...backends: WeaponBackend[]) {
    this.backends = backends;
  }

  public setIntent(intent: WeaponIntent): void {
    this.currentIntent = intent;
  }

  public update(dt: number, ship: Ship, transform: ShipTransform): void {
    for (const backend of this.backends) {
      backend.update(dt, ship, transform, this.currentIntent);
    }
  }
}
