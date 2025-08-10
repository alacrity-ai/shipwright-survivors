// src/game/boss/BossManager.ts

import type { ShipFactory } from '@/game/ship/factories/ShipFactory';
import type { CombatService } from '@/systems/combat/CombatService';

import { BossFactory } from '@/game/boss/factories/BossFactory';
import { BossOrchestrator } from '@/game/boss/BossOrchestrator';
import { BaseBossAIController } from '@/game/boss/ai/bosses/BaseBossAIController';
import { BossIntroCutsceneController } from '@/game/boss/cutscenes/BossIntroCutsceneController';

export class BossManager {
  private static _instance: BossManager | null = null;

  private readonly combatService: CombatService;
  private readonly bossFactory: BossFactory;
  private readonly orchestrator: BossOrchestrator;
  private readonly shipFactory: ShipFactory;

  private constructor(shipFactory: ShipFactory, combatService: CombatService) {
    this.shipFactory = shipFactory;
    this.bossFactory = new BossFactory(shipFactory);
    this.combatService = combatService;

    // Instantiate orchestrator with injected systems
    this.orchestrator = new BossOrchestrator(
      this.bossFactory,
      new BossIntroCutsceneController(),
      this.combatService
    );
  }

  public static initialize(shipFactory: ShipFactory, combatService: CombatService): BossManager {
    if (!this._instance) {
      this._instance = new BossManager(shipFactory, combatService);
    }
    return this._instance;
  }

  public static getInstance(): BossManager {
    if (!this._instance) {
      throw new Error('BossManager has not been initialized');
    }
    return this._instance;
  }

  // === Public API ===

  public getFactory(): BossFactory {
    return this.bossFactory;
  }

  public getShipFactory(): ShipFactory {
    return this.shipFactory;
  }

  public getOrchestrator(): BossOrchestrator {
    return this.orchestrator;
  }

  public getAIController(): BaseBossAIController | null {
    return this.orchestrator.getAIController();
  }

  public getCutsceneController(): BossIntroCutsceneController {
    return this.orchestrator.getCutsceneController();
  }

  public getCombatService(): CombatService {
    return this.combatService;
  }

  public bossDefeated(): boolean {
    return this.orchestrator.bossDefeated();
  }

  public fightComplete(): boolean {
    return this.bossDefeated()
  }

  /** Per-tick boss update — AI, cutscene, etc. */
  public update(dt: number): void {
    // Orchestrator is responsible for per-frame AI updates and cutscene updates
    this.orchestrator.update?.(dt);
  }

  /** Clears in-battle boss state (e.g., on death) */
  public clear(): void {
    this.orchestrator.clear();
  }

  /** Fully tears down the manager */
  public destroy(): void {
    this.clear();
    BossManager._instance = null;
  }
}
