// src/game/boss/BossOrchestrator.ts

import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';
import type { BossSpawnContext } from '@/game/boss/interfaces/BossSpawnContext';
import type { BossFactory } from '@/game/boss/factories/BossFactory';
import type { BossIntroCutsceneController } from '@/game/boss/cutscenes/BossIntroCutsceneController';
import type { BossAIController } from '@/game/boss/ai/BossAIController';
import type { Ship } from '@/game/ship/Ship';

import { applyShipColorPreset, ShipColorPreset } from '../ship/utils/shipColorHelpers';

export class BossOrchestrator {
  constructor(
    private readonly factory: BossFactory,
    private readonly cutsceneController: BossIntroCutsceneController,
    private readonly aiController: BossAIController,

    private bossShip: Ship | null = null
  ) {}

  // == Public API

  public async spawnBoss(definition: BossDefinition, position: { x: number; y: number }): Promise<void> {
    const context: BossSpawnContext = { definition, position };
    const { ship } = await this.factory.create(context);

    // Let the boss be invulnerable to start, turn off invulnerability after cutscene
    ship.setAffixes({ invulnerable: true });
    // Set the boss ship color to red for more boss feel
    applyShipColorPreset(ship, ShipColorPreset.Red);
    
    this.bossShip = ship; // Retain reference for AI activation and death awaiting

    // Retain reference, emit event, etc.
  }

  public async runIntroCutscene(): Promise<void> {
    await this.cutsceneController.play();
  }

  public async activateAI(): Promise<void> {
    // Turn off invulnerability here
    this.bossShip?.setAffixes({ invulnerable: false });

    await this.aiController.start();
  }

  public async awaitDeath(): Promise<void> {
    // await waitUntil(() => !this.bossShip?.isAlive());
  }
}
