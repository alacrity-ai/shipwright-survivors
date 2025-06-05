// src/game/ship/ShipFactory.ts

import { loadShipFromJson } from '@/systems/serialization/ShipSerializer';
import { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';
import { MovementSystem } from '@/systems/physics/MovementSystem';
import { WeaponSystem } from '@/systems/combat/WeaponSystem';
import { TurretBackend } from '@/systems/combat/backends/TurretBackend';
import { LaserBackend } from '@/systems/combat/backends/LaserBackend';
import { ExplosiveLanceBackend } from '@/systems/combat/backends/ExplosiveLanceBackend';
import { UtilitySystem } from '@/systems/combat/UtilitySystem';
import { ShieldToggleBackend } from '@/systems/combat/backends/ShieldToggleBackend';
import { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import { SeekTargetState } from '@/systems/ai/fsm/SeekTargetState';
import type { Grid } from '@/systems/physics/Grid';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import type { Ship } from '@/game/ship/Ship';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { LaserSystem } from '@/systems/physics/LaserSystem';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { BlockObjectCollisionSystem } from '@/systems/physics/BlockObjectCollisionSystem';

export class ShipFactory {
  public constructor(
    private readonly grid: Grid,
    private readonly registry: ShipRegistry,
    private readonly orchestrator: AIOrchestratorSystem,
    private readonly playerShip: Ship, // So the enemy ships can target it on spawn in
    private readonly particleManager: ParticleManager,
    private readonly projectileSystem: ProjectileSystem,
    private readonly laserSystem: LaserSystem,
    private readonly combatService: CombatService,
    private readonly explosionSystem: ExplosionSystem,
    private readonly collisionSystem: BlockObjectCollisionSystem
  ) {}

  public async createShip(
    jsonName: string,
    x: number,
    y: number,
    hunter: boolean = false
  ): Promise<{ ship: Ship; controller: AIControllerSystem }> {
    const ship = await loadShipFromJson(`${jsonName}.json`, this.grid);

    const transform = ship.getTransform();
    transform.position.x = x;
    transform.position.y = y;

    this.registry.add(ship);

    const emitter = new ThrusterEmitter(this.particleManager);
    const movement = new MovementSystem(ship, emitter, this.collisionSystem);
    const weapons = new WeaponSystem(
      new TurretBackend(this.projectileSystem, this.playerShip),
      new LaserBackend(this.laserSystem),
      new ExplosiveLanceBackend(this.combatService, this.particleManager, this.grid, this.explosionSystem, this.playerShip)
    );
    const utility = new UtilitySystem(new ShieldToggleBackend());

    const controller = new AIControllerSystem(ship, movement, weapons, utility);
    controller['currentState'] = new SeekTargetState(controller, ship, this.playerShip);
    controller.setHunter(hunter);

    this.orchestrator.addController(controller);

    ship.updateBlockPositions();

    return { ship, controller };
  }
}
