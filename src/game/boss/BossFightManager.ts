// src/game/boss/BossFightManager.ts

import { BossArenaCollisionEnforcer } from './BossArenaCollisionEnforcer';


// Forward declaration (stubbed for now)
import type { BossAIController } from './ai/BossAIController';

export class BossFightManager {
  private static _instance: BossFightManager | null = null;

  private readonly collisionEnforcer: BossArenaCollisionEnforcer;
  private aiController: BossAIController | null = null;

  private constructor() {
    // 1. Instantiate collision enforcer (auto-subscribes to GlobalEventBus)
    this.collisionEnforcer = new BossArenaCollisionEnforcer();

    // 2. BossAIController is stubbed and optional
    this.aiController = null;
  }

  public static initialize(): BossFightManager {
    if (!this._instance) {
      this._instance = new BossFightManager();
    }
    return this._instance;
  }

  public static getInstance(): BossFightManager {
    if (!this._instance) {
      throw new Error('BossFightManager has not been initialized');
    }
    return this._instance;
  }

  // === Public API ===

  public getCollisionEnforcer(): BossArenaCollisionEnforcer {
    return this.collisionEnforcer;
  }

  public getAIController(): BossAIController | null {
    return this.aiController;
  }

  public setAIController(controller: BossAIController): void {
    this.aiController = controller;
  }

  /** Called each simulation tick. Updates AI + collision enforcement. */
  public update(dt: number): void {
    this.collisionEnforcer.update(dt);
    this.aiController?.update?.(dt);
  }

  /** Clears boss-specific state without releasing manager instance. */
  public clear(): void {
    this.aiController?.destroy?.(); // Optional; idempotent
    this.aiController = null;
    this.collisionEnforcer.disable(); // Disarms arena checks
  }

  /** Full teardown — clears state and unsubscribes from event bus. */
  public destroy(): void {
    this.clear();
    this.collisionEnforcer.destroy(); // Handles its own EventBus unbinding
  }
}
