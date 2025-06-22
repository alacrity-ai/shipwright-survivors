// import { Ship } from '@/game/ship/Ship';
// import { FiringMode } from '@/systems/combat/types/WeaponTypes';
// import { Faction } from '@/game/interfaces/types/Faction';

// import type { Grid } from '@/systems/physics/Grid';

// export function getStarterShip(grid: Grid) {
//       const ship = new Ship(grid, undefined, undefined, true, undefined, Faction.Player);
//       ship.setIsPlayerShip(true);
  
//       // Initialize ship with blocks
//       ship.placeBlockById({ x: 0, y: -3 }, 'hull1');
//       ship.placeBlockById({ x: 0, y: 0 }, 'cockpit1');
//       ship.placeBlockById({ x: 0, y: -1 }, 'hull1');
//       ship.placeBlockById({ x: 0, y: -2 }, 'turret1');
//       ship.placeBlockById({ x: -1, y: -1 }, 'fin1');
//       ship.placeBlockById({ x: 1, y: -1 }, 'fin1', 90);
//       ship.placeBlockById({ x: 1, y: 0 }, 'hull1');
//       ship.placeBlockById({ x: -1, y: 0 }, 'hull1');
//       ship.placeBlockById({ x: 2, y: 0 }, 'turret1', 90);
//       ship.placeBlockById({ x: -2, y: 0 }, 'turret1');
//       ship.placeBlockById({ x: 0, y: 1 }, 'engine1');
//       ship.placeBlockById({ x: -1, y: 1 }, 'engine1');
//       ship.placeBlockById({ x: 1, y: 1 }, 'engine1');

//       ship.hideAllBlocks();
//       ship.setFiringMode(FiringMode.Sequence);
//       return ship;
// }


import { Ship } from '@/game/ship/Ship';
import { Grid } from '@/systems/physics/Grid';
import { Faction } from '@/game/interfaces/types/Faction';
import { ShipFactory } from '@/game/ship/factories/ShipFactory';

import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { LaserSystem } from '@/systems/physics/LaserSystem';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { BlockObjectCollisionSystem } from '@/systems/physics/BlockObjectCollisionSystem';
import type { ShipConstructionAnimatorService } from '@/game/ship/systems/ShipConstructionAnimatorService';

import { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';
import { MovementSystem } from '@/systems/physics/MovementSystem';
import { WeaponSystem } from '@/systems/combat/WeaponSystem';
import { UtilitySystem } from '@/systems/combat/UtilitySystem';
import { AIControllerSystem } from '@/systems/ai/AIControllerSystem';


export interface ShipResult {
  ship: Ship;
  controller: AIControllerSystem | null;
  emitter: ThrusterEmitter;
  movement: MovementSystem;
  weapons: WeaponSystem;
  utility: UtilitySystem;
}

/**
 * Loads a starter ship using the ShipFactory with provided subsystems.
 * @returns A Promise resolving to the player Ship instance.
 */
export async function getStarterShip(
  grid: Grid,
  registry: ShipRegistry,
  particleManager: ParticleManager,
  projectileSystem: ProjectileSystem,
  laserSystem: LaserSystem,
  combatService: CombatService,
  explosionSystem: ExplosionSystem,
  collisionSystem: BlockObjectCollisionSystem,
  constructionAnimator: ShipConstructionAnimatorService,
  jsonFilename: string
): Promise<ShipResult> {
  const factory = new ShipFactory(
    grid,
    registry,
    particleManager,
    projectileSystem,
    laserSystem,
    combatService,
    explosionSystem,
    collisionSystem,
    constructionAnimator
    // no orchestrator passed — player ship doesn't use AI
  );

  const { ship, controller, emitter, movement, weapons, utility } = await factory.createShip(
    jsonFilename,
    0,                 // x
    0,                 // y
    false,             // hunter
    undefined,         // behaviorProfile
    {},                // affixes
    Faction.Player,    // faction
    false,             // registerController
    false,             // unCullable
    true               // isPlayerShip
  );

  return { ship, controller, emitter, movement, weapons, utility };
}
