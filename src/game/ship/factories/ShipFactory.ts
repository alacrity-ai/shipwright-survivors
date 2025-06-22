import { loadShipFromJson } from '@/systems/serialization/ShipSerializer';
import { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';
import { MovementSystem } from '@/systems/physics/MovementSystem';
import { WeaponSystem } from '@/systems/combat/WeaponSystem';
import { TurretBackend } from '@/systems/combat/backends/weapons/TurretBackend';
import { LaserBackend } from '@/systems/combat/backends/weapons/LaserBackend';
import { ExplosiveLanceBackend } from '@/systems/combat/backends/weapons/ExplosiveLanceBackend';
import { HaloBladeBackend } from '@/systems/combat/backends/weapons/HaloBladeBackend';
import { UtilitySystem } from '@/systems/combat/UtilitySystem';
import { ShieldToggleBackend } from '@/systems/combat/backends/utility/ShieldToggleBackend';
import { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import { DefaultBehaviorProfile } from '@/systems/ai/types/BehaviorProfile';
import { Faction } from '@/game/interfaces/types/Faction';
import { FiringMode } from '@/systems/combat/types/WeaponTypes';

import type { Grid } from '@/systems/physics/Grid';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import type { Ship } from '@/game/ship/Ship';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { LaserSystem } from '@/systems/physics/LaserSystem';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { BlockObjectCollisionSystem } from '@/systems/physics/BlockObjectCollisionSystem';
import type { ShipConstructionAnimatorService } from '@/game/ship/systems/ShipConstructionAnimatorService';
import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';
import type { BehaviorTypeKey } from '@/systems/ai/types/BehaviorProfileRegistry';

import { BehaviorProfileRegistry } from '@/systems/ai/types/BehaviorProfileRegistry';

export type AuraLightOptions = {
  color: string;
  radius: number;
  intensity: number;
};

function isBehaviorTypeKey(value: string): value is BehaviorTypeKey {
  return value in BehaviorProfileRegistry;
}

export class ShipFactory {
  public constructor(
    private readonly grid: Grid,
    private readonly registry: ShipRegistry,
    private readonly particleManager: ParticleManager,
    private readonly projectileSystem: ProjectileSystem,
    private readonly laserSystem: LaserSystem,
    private readonly combatService: CombatService,
    private readonly explosionSystem: ExplosionSystem,
    private readonly collisionSystem: BlockObjectCollisionSystem,
    private readonly shipConstructionAnimator: ShipConstructionAnimatorService,
    private readonly orchestrator?: AIOrchestratorSystem // ← now optional
  ) {}

  public async createShip(
    jsonName: string,
    x: number,
    y: number,
    hunter: boolean = false,
    behaviorProfile?: BehaviorProfile,
    affixes: ShipAffixes = {},
    faction: Faction = Faction.Enemy,
    registerController: boolean = true,
    unCullable: boolean = false,
    isPlayerShip: boolean = false
  ): Promise<{ ship: Ship; controller: AIControllerSystem | null, emitter: ThrusterEmitter, movement: MovementSystem, weapons: WeaponSystem, utility: UtilitySystem }> {
    const { ship, behaviorType } = await loadShipFromJson(`${jsonName}.json`, this.grid, faction);

    if (behaviorType && !isBehaviorTypeKey(behaviorType)) {
      console.warn(`[AI] Unknown behaviorType "${behaviorType}" — falling back to default.`);
    }

    ship.setAffixes(affixes);
    ship.setFaction(faction);

    const transform = ship.getTransform();
    transform.position.x = x;
    transform.position.y = y;

    this.registry.add(ship);
    if (isPlayerShip) {
      this.registry.setPlayerShip(ship);
    }

    const emitter = new ThrusterEmitter(this.particleManager);
    const movement = new MovementSystem(ship, emitter, this.collisionSystem);
    const weapons = new WeaponSystem(
      new TurretBackend(this.projectileSystem),
      new LaserBackend(this.laserSystem),
      new ExplosiveLanceBackend(this.combatService, this.particleManager, this.grid, this.explosionSystem),
      new HaloBladeBackend(this.combatService, this.particleManager, this.grid, ship)
    );
    const utility = new UtilitySystem(new ShieldToggleBackend());

    let controller: AIControllerSystem | null = null;

    if (!isPlayerShip) {
      const effectiveProfile =
        behaviorProfile ??
        (typeof behaviorType === 'string' && isBehaviorTypeKey(behaviorType)
          ? BehaviorProfileRegistry[behaviorType]
          : undefined) ??
        DefaultBehaviorProfile;

      controller = new AIControllerSystem(ship, movement, weapons, utility, effectiveProfile);

      if (effectiveProfile.initialStateFactory) {
        const initialState = effectiveProfile.initialStateFactory(controller);
        controller.setInitialState(initialState);
      }

      controller.setHunter(hunter);

      if (registerController && this.orchestrator) {
        this.orchestrator.addController(controller, unCullable);
      }
    } else {
      ship.setIsPlayerShip(true);
      ship.setFiringMode(FiringMode.Sequence);
    }

    ship.hideAllBlocks();
    ship.updateBlockPositions();

    const auraLightColor = isPlayerShip ? '#ADD8E6' : '#ff0000';
    const auraLightOptions: AuraLightOptions = {
      color: auraLightColor,
      radius: 96,
      intensity: 0.8
    };
    this.shipConstructionAnimator.animateShipConstruction(ship, auraLightOptions);

    return { ship, controller, emitter, movement, weapons, utility };
  }

  public getOrchestrator(): AIOrchestratorSystem | undefined {
    return this.orchestrator;
  }
}
