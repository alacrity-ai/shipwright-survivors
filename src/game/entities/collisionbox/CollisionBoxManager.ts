// src/game/entities/collisionbox/CollisionBoxManager.ts

import { CollisionBoxStore } from '@/game/entities/collisionbox/CollisionBoxStore';
import { BoxSpatialGrid } from '@/game/entities/collisionbox/BoxSpatialGrid';
import { CollisionBoxOrchestrator } from '@/game/entities/collisionbox/CollisionBoxOrchestrator';

/**
 * Singleton manager for the CollisionBox system.
 * Provides centralized access to the store, grid, and orchestrator,
 * mirroring the design of BlockManager.
 */
export class CollisionBoxManager {
  private static _instance: CollisionBoxManager | null = null;

  public readonly store: CollisionBoxStore;
  public readonly grid: BoxSpatialGrid;
  public readonly orchestrator: CollisionBoxOrchestrator;

  // Capacity: tuned for expected number of active ships (enemies + players).
  private static readonly BOX_CAPACITY = 10_000;

  private constructor() {
    // 1. Create CollisionBoxStore
    this.store = new CollisionBoxStore(CollisionBoxManager.BOX_CAPACITY);

    // 2. Create BoxSpatialGrid (needs store)
    this.grid = new BoxSpatialGrid(this.store);

    // 3. Create Orchestrator (wired with store and grid)
    this.orchestrator = new CollisionBoxOrchestrator(this.store, this.grid);
  }

  /**
   * Initializes the singleton if it hasn’t been created yet.
   */
  public static initialize(): CollisionBoxManager {
    if (!this._instance) {
      this._instance = new CollisionBoxManager();
    }
    return this._instance;
  }

  /**
   * Returns the singleton instance.
   * Throws if not initialized.
   */
  public static getInstance(): CollisionBoxManager {
    if (!this._instance) {
      throw new Error('CollisionBoxManager has not been initialized');
    }
    return this._instance;
  }

  // === Public API ===

  /** Returns the underlying CollisionBoxStore. */
  public getCollisionBoxStore(): CollisionBoxStore {
    return this.store;
  }

  /** Returns the BoxSpatialGrid (broad-phase grid for collision boxes). */
  public getBoxSpatialGrid(): BoxSpatialGrid {
    return this.grid;
  }

  /** Returns the CollisionBoxOrchestrator for lifecycle & transforms. */
  public getCollisionBoxOrchestrator(): CollisionBoxOrchestrator {
    return this.orchestrator;
  }

  /**
   * Clears all collision boxes, grid cells, and orchestrator state.
   * Useful on level reset or when reloading all ships.
   */
  public clear(): void {
    this.orchestrator.clearAll();
    this.grid.clear();
    this.store.clear();
    CollisionBoxManager._instance = null;
  }
}
