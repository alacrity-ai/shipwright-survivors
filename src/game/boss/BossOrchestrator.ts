// src/game/boss/BossOrchestrator.ts

import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';
import type { BossSpawnContext } from '@/game/boss/interfaces/BossSpawnContext';
import type { BossFactory } from '@/game/boss/factories/BossFactory';
import type { BossIntroCutsceneController } from '@/game/boss/cutscenes/BossIntroCutsceneController';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { CombatService } from '@/systems/combat/CombatService';
import type { Ship } from '@/game/ship/Ship';

import { CanvasManager } from '@/core/CanvasManager';
import { drawBossHealthbar } from '@/game/boss/helpers/drawHealthbar';

import { missionLoader } from '@/game/missions/MissionLoader';
import { audioManager } from '@/audio/Audio';
import { applyShipColorPreset, ShipColorPreset } from '../ship/utils/shipColorHelpers';

export class BossOrchestrator {
  private bossShip: Ship | null = null;
  private aiController: BaseBossAIController | null = null;
  private ctx: CanvasRenderingContext2D;

  constructor(
    private readonly factory: BossFactory,
    private readonly cutsceneController: BossIntroCutsceneController,
    private readonly combatService: CombatService
  ) {
    const canvasManager = CanvasManager.getInstance();
    this.ctx = canvasManager.getContext('overlay');
  }

  // == Public API ==

  public async spawnBoss(definition: BossDefinition, position: { x: number; y: number }): Promise<void> {
    const context: BossSpawnContext = { definition, position };
    const { ship, aiController } = await this.factory.create(context);

    if (!aiController) {
      throw new Error(`[BossOrchestrator] Failed to spawn AI controller for boss '${definition.id}'`);
    }

    // Set pre-fight affixes and appearance
    ship.setAffixes({ invulnerable: true });
    applyShipColorPreset(ship, ShipColorPreset.Red);

    // Retain references
    this.bossShip = ship;
    this.aiController = aiController;

    // DEBUG: Activate AI immediately for testing
    this.activateAI();
  }

  public async runIntroCutscene(): Promise<void> {
    await this.cutsceneController.play();
  }

  public async activateAI(): Promise<void> {
    if (!this.bossShip || !this.aiController) {
      throw new Error('[BossOrchestrator] Cannot activate AI — boss not yet spawned');
    }

    // Start Boss Music
    const missionDef = missionLoader.getMission();
    if (missionDef.bossMusic) {
      audioManager.playMusic(missionDef.bossMusic);
    }

    // Remove invulnerability for combat
    this.bossShip.setAffixes({ invulnerable: false });

    // Start FSM
    this.aiController.start?.();
  }

  public async awaitDeath(): Promise<void> {
    // Replace with your observable/awaitable death system
    // await waitUntil(() => !this.bossShip?.isAlive());
  }

  /** Per-frame update hook for FSM, called externally via BossManager */
  public update(dt: number): void {
    this.aiController?.update(dt);
    if (this.bossShip && !this.bossShip.isDestroyed()) {
      drawBossHealthbar(this.ctx, this.bossShip);
    }
  }

  // == Pass throughs ==

  public getBossShip(): Ship | null {
    return this.bossShip;
  }

  public getAIController(): BaseBossAIController | null {
    return this.aiController;
  }

  public getCutsceneController(): BossIntroCutsceneController {
    return this.cutsceneController;
  }

  public getCombatService(): CombatService {
    return this.combatService;
  }

  // == Cleanup
  public clear(): void {
    this.bossShip = null;
    this.aiController = null;
  }

  public destroy(): void {
    this.clear();
  }
}
