import { Ship } from '@/game/ship/Ship';
import { Grid } from '@/systems/physics/Grid';
import { Faction } from '@/game/interfaces/types/Faction';
import { ShipFactory } from '@/game/ship/factories/ShipFactory';

import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { BlockObjectCollisionSystem } from '@/systems/physics/BlockObjectCollisionSystem';
import type { ShipConstructionAnimatorService } from '@/game/ship/systems/ShipConstructionAnimatorService';

import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { applyShipColorPreset } from './shipColorHelpers';

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
  combatService: CombatService,
  explosionSystem: ExplosionSystem,
  collisionSystem: BlockObjectCollisionSystem,
  constructionAnimator: ShipConstructionAnimatorService,
  jsonFilename: string,
  createInstantly: boolean = false
): Promise<ShipResult> {
  const factory = new ShipFactory(
    grid,
    registry,
    particleManager,
    projectileSystem,
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
    true,               // isPlayerShip
    createInstantly
  );

  const presetColor = PlayerShipCollection.getInstance().getSelectedColor();
  applyShipColorPreset(ship, presetColor);

  return { ship, controller, emitter, movement, weapons, utility };
}

export async function getStarterShipFromJson(
  jsonData: any,
  grid: Grid,
  registry: ShipRegistry,
  particleManager: ParticleManager,
  projectileSystem: ProjectileSystem,
  combatService: CombatService,
  explosionSystem: ExplosionSystem,
  collisionSystem: BlockObjectCollisionSystem,
  constructionAnimator: ShipConstructionAnimatorService
): Promise<ShipResult> {
  const factory = new ShipFactory(
    grid,
    registry,
    particleManager,
    projectileSystem,
    combatService,
    explosionSystem,
    collisionSystem,
    constructionAnimator
  );

  const { ship, controller, emitter, movement, weapons, utility } = await factory.createShipFromJsonObject(
    jsonData,
    0, // x
    0, // y
    false,
    undefined,
    {},
    Faction.Player,
    false,
    false,
    true
  );

  const presetColor = PlayerShipCollection.getInstance().getSelectedColor();
  applyShipColorPreset(ship, presetColor);

  return { ship, controller, emitter, movement, weapons, utility };
}
