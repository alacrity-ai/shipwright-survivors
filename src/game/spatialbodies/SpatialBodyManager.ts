// src/game/spatialbodies/SpatialBodyManager.ts

import { SpatialBodyStore } from './SpatialBodyStore';
import { SpatialBodyGrid } from './SpatialBodyGrid';
import { SpatialBodyOrchestrator } from './SpatialBodyOrchestrator';

/**
 * Singleton manager for the SpatialBody system.
 * Provides centralized access to the store, grid, and orchestrator,
 * following the same pattern as CollisionBoxManager.
 */
export class SpatialBodyManager {
  private static _instance: SpatialBodyManager | null = null;

  public readonly store: SpatialBodyStore;
  public readonly grid: SpatialBodyGrid;
  public readonly orchestrator: SpatialBodyOrchestrator;

  // Capacity: tuned for high-density fields (ice, magma, meteors, etc.)
  private static readonly BODY_CAPACITY = 1024;

  private constructor() {
    // 1. Create SpatialBodyStore
    this.store = new SpatialBodyStore(SpatialBodyManager.BODY_CAPACITY);

    // 2. Create SpatialBodyGrid (requires store)
    this.grid = new SpatialBodyGrid(this.store);

    // 3. Create Orchestrator (wired with store and grid)
    this.orchestrator = new SpatialBodyOrchestrator(this.store, this.grid);
  }

  /**
   * Initializes the singleton if it hasn’t been created yet.
   */
  public static initialize(): SpatialBodyManager {
    if (!this._instance) {
      this._instance = new SpatialBodyManager();
    }
    return this._instance;
  }

  /**
   * Returns the singleton instance.
   * Throws if not initialized.
   */
  public static getInstance(): SpatialBodyManager {
    if (!this._instance) {
      throw new Error('SpatialBodyManager has not been initialized');
    }
    return this._instance;
  }

  // === Public API ===

  /** Returns the underlying SpatialBodyStore (SOA for all bodies). */
  public getSpatialBodyStore(): SpatialBodyStore {
    return this.store;
  }

  /** Returns the SpatialBodyGrid (broad-phase grid for culling). */
  public getSpatialBodyGrid(): SpatialBodyGrid {
    return this.grid;
  }

  /** Returns the SpatialBodyOrchestrator for population and lifecycle. */
  public getSpatialBodyOrchestrator(): SpatialBodyOrchestrator {
    return this.orchestrator;
  }

  /**
   * Clears all spatial bodies, grid cells, and orchestrator state.
   * Useful on mission reset or world reload.
   */
  public clear(): void {
    this.orchestrator.clearAll();
    this.grid.clear();
    this.store.clear();
    SpatialBodyManager._instance = null;
  }
}
