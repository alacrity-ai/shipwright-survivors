// src/game/boss/BossManager.ts

import type { ShipFactory } from '@/game/ship/factories/ShipFactory';
import { BossFactory } from '@/game/boss/factories/BossFactory';
import { BossOrchestrator } from '@/game/boss/BossOrchestrator';
// import { BossAIController } from '@/game/boss/ai/BossAIController';
// import { BossIntroCutsceneController } from '@/game/boss/cutscenes/BossIntroCutsceneController';

export class BossManager {
  private static _instance: BossManager | null = null;

  private readonly bossFactory: BossFactory;
  // private aiController: BossAIController;
  // private cutsceneController: BossIntroCutsceneController;
  private readonly orchestrator: BossOrchestrator;

  private constructor(shipFactory: ShipFactory) {
    this.bossFactory = new BossFactory(shipFactory);

    // TODO: Instantiate subsystems once implemented
    // this.aiController = new BossAIController();
    // this.cutsceneController = new BossIntroCutsceneController();

    // Instantiate orchestrator with injected systems
    this.orchestrator = new BossOrchestrator(
      this.bossFactory,
      /* this.cutsceneController, */
      /* this.aiController */
      // Temporarily pass placeholders or nulls if needed
      null as any,
      null as any
    );
  }

  public static initialize(shipFactory: ShipFactory): BossManager {
    if (!this._instance) {
      this._instance = new BossManager(shipFactory);
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

  public getOrchestrator(): BossOrchestrator {
    return this.orchestrator;
  }

  // public getAIController(): BossAIController {
  //   return this.aiController;
  // }

  // public getCutsceneController(): BossIntroCutsceneController {
  //   return this.cutsceneController;
  // }

  /** Per-tick boss update — AI, cutscene, etc. */
  public update(dt: number): void {
    // this.aiController?.update(dt);
    // this.cutsceneController?.update(dt);
  }

  /** Clears in-battle boss state (e.g., on death) */
  public clear(): void {
    // this.aiController = null;
    // this.cutsceneController?.destroy();
    // this.cutsceneController = null;
  }

  /** Fully tears down the manager */
  public destroy(): void {
    this.clear();
    BossManager._instance = null;
  }
}
