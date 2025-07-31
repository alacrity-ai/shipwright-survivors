// src/game/boss/ArenaManager.ts

import { ArenaCollisionEnforcer } from '@/game/arena/ArenaCollisionEnforcer';

export class ArenaManager {
  private static _instance: ArenaManager | null = null;

  private readonly collisionEnforcer: ArenaCollisionEnforcer;

  private constructor() {
    // 1. Instantiate collision enforcer (auto-subscribes to GlobalEventBus)
    this.collisionEnforcer = new ArenaCollisionEnforcer();
  }

  public static initialize(): ArenaManager {
    if (!this._instance) {
      this._instance = new ArenaManager();
    }
    return this._instance;
  }

  public static getInstance(): ArenaManager {
    if (!this._instance) {
      throw new Error('ArenaManager has not been initialized');
    }
    return this._instance;
  }

  // === Public API ===

  public getCollisionEnforcer(): ArenaCollisionEnforcer {
    return this.collisionEnforcer;
  }

  public getArenaCenter(): [number, number] {
    return this.collisionEnforcer.getArenaCenter();
  }

  public getArenaRadius(): number {
    return this.collisionEnforcer.getArenaRadius();
  }

  /** Called each simulation tick. Updates AI + collision enforcement. */
  public update(dt: number): void {
    this.collisionEnforcer.update(dt);
  }

  /** Clears boss-specific state without releasing manager instance. */
  public clear(): void {
    this.collisionEnforcer.disable(); // Disarms arena checks
  }

  /** Full teardown — clears state and unsubscribes from event bus. */
  public destroy(): void {
    this.clear();
    this.collisionEnforcer.destroy(); // Handles its own EventBus unbinding
    ArenaManager._instance = null;
  }
}
