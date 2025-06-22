// src/game/waves/WaveOrchestratorFactory.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { IncidentOrchestrator } from '@/systems/incidents/IncidentOrchestrator';
import type { PopupMessageSystem } from '@/ui/PopupMessageSystem';

import type { Grid } from '@/systems/physics/Grid';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { LaserSystem } from '@/systems/physics/LaserSystem';
import type { CombatService } from '@/systems/combat/CombatService';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { BlockObjectCollisionSystem } from '@/systems/physics/BlockObjectCollisionSystem';
import type { ShipConstructionAnimatorService } from '@/game/ship/systems/ShipConstructionAnimatorService';

import { ShipFactory } from '@/game/ship/factories/ShipFactory';
import { ShipFormationFactory } from '@/game/ship/factories/ShipFormationFactory';

import { WaveOrchestrator } from '@/game/waves/orchestrator/WaveOrchestrator';
import { DefaultScriptRunner } from '@/game/waves/scripting/ScriptRunner';
import { SpawnCoordinateResolver } from '@/game/waves/executor/SpawnCoordinateResolver';
import { WaveModifiersApplier } from '@/game/waves/executor/WaveModifiersApplier';
import { WaveExecutor } from '@/game/waves/executor/WaveExecutor';

export class WaveOrchestratorFactory {
  static create(
    waves: WaveDefinition[],
    grid: Grid,
    shipRegistry: ShipRegistry,
    aiOrchestrator: AIOrchestratorSystem,
    particleManager: ParticleManager,
    projectileSystem: ProjectileSystem,
    laserSystem: LaserSystem,
    combatService: CombatService,
    explosionSystem: ExplosionSystem,
    collisionSystem: BlockObjectCollisionSystem,
    shipConstructionAnimator: ShipConstructionAnimatorService,
    incidentOrchestrator: IncidentOrchestrator,
    popupMessageSystem: PopupMessageSystem
  ): WaveOrchestrator {
    const playerShip = shipRegistry.getPlayerShip();
    if (!playerShip) {
      throw new Error('Player ship not found');
    }

    // === Build core factories
    const shipFactory = new ShipFactory(
      grid,
      shipRegistry,
      aiOrchestrator,
      playerShip,
      particleManager,
      projectileSystem,
      laserSystem,
      combatService,
      explosionSystem,
      collisionSystem,
      shipConstructionAnimator
    );

    const formationFactory = new ShipFormationFactory(shipFactory);

    // === Wave execution dependencies
    const scriptRunner = new DefaultScriptRunner();
    const spawnResolver = new SpawnCoordinateResolver();
    const modApplier = new WaveModifiersApplier();

    const executor = new WaveExecutor(
      shipFactory,
      formationFactory,
      incidentOrchestrator,
      popupMessageSystem,
      scriptRunner,
      spawnResolver,
      modApplier
    );

    return new WaveOrchestrator(waves, executor);
  }
}
