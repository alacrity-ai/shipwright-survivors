// src/game/boss/BossOrchestrator.ts

import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';
import type { BossSpawnContext } from '@/game/boss/interfaces/BossSpawnContext';
import type { BossFactory } from '@/game/boss/factories/BossFactory';
import type { BossIntroCutsceneController } from '@/game/boss/cutscenes/BossIntroCutsceneController';
import type { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import type { CombatService } from '@/systems/combat/CombatService';
import type { Ship } from '@/game/ship/Ship';

import { showBossHealthbar, hideBossHealthbar } from '@/core/interfaces/events/BossReporter';
import { emitHudHideAll, emitHudShowAll } from '@/core/interfaces/events/HudReporter';
import { clearAllScreenEdgeIndicators, disableScreenEdgeIndicators } from '@/core/interfaces/events/ScreenEdgeIndicatorReporter';

import { missionLoader } from '@/game/missions/MissionLoader';
import { audioManager } from '@/audio/Audio';
import { applyShipColorPreset, ShipColorPreset } from '../ship/utils/shipColorHelpers';

export class BossOrchestrator {
  private bossShip: Ship | null = null;
  private aiController: BaseBossAIController | null = null;

  constructor(
    private readonly factory: BossFactory,
    private readonly cutsceneController: BossIntroCutsceneController,
    private readonly combatService: CombatService,

    private shipDestroyed: boolean = false
  ) {}

  // == Public API ==

  public async spawnBoss(definition: BossDefinition, position: { x: number; y: number }): Promise<void> {
    const context: BossSpawnContext = { definition, position };
    const { ship, aiController } = await this.factory.create(context);

    if (!aiController) {
      throw new Error(`[BossOrchestrator] Failed to spawn AI controller for boss '${definition.id}'`);
    }

    // Set pre-fight affixes and appearance
    ship.setAffixes({ invulnerable: true });
    ship.onDestroyedCallback(() => this.onDeathCallback());
    applyShipColorPreset(ship, ShipColorPreset.Red);

    // Retain references
    this.bossShip = ship;
    this.aiController = aiController;

    // Clear UI Elements
    emitHudHideAll();
    clearAllScreenEdgeIndicators();
    disableScreenEdgeIndicators();

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

    // Draw boss healthbar
    showBossHealthbar();
  }

  public onDeathCallback(): void {
    this.shipDestroyed = true;
  }

  public async awaitDeath(): Promise<void> {
    // Replace with your observable/awaitable death system
    // await waitUntil(() => !this.bossShip?.isAlive());
  }

  /** Per-frame update hook for FSM, called externally via BossManager */
  public update(dt: number): void {
    this.aiController?.update(dt);
  }

  // == Pass throughs ==

  public bossDefeated(): boolean {
    return this.shipDestroyed;
  }

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
    hideBossHealthbar();
    this.bossShip = null;
    this.aiController = null;
  }

  public destroy(): void {
    this.clear();
  }
}
