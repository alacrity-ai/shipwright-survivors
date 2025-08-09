// src/game/blocks/system/BlockManager.ts
import { BlockStore } from './BlockStore';
import { BlockSpatialGrid } from './BlockSpatialGrid';
import { BlockOrchestrator, BlockRegistry } from './BlockOrchestrator';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

export class BlockManager {
  private static _instance: BlockManager | null = null;

  public readonly store: BlockStore;
  public readonly grid: BlockSpatialGrid;
  public readonly orchestrator: BlockOrchestrator;

  private static readonly BLOCK_CAPACITY = 200_000; // tune for max block count

  private constructor() {
    // 1. Create BlockStore
    this.store = new BlockStore(BlockManager.BLOCK_CAPACITY);

    // 2. Create BlockSpatialGrid (needs store)
    this.grid = new BlockSpatialGrid(this.store);

    // 3. Provide BlockRegistry adapter for orchestrator
    const registry: BlockRegistry = {
      getBlockType: (id: string) => getBlockType(id)
    };

    // 4. Create Orchestrator (wired with store, grid, and registry)
    this.orchestrator = new BlockOrchestrator(this.store, this.grid, registry);
  }

  public static initialize(): BlockManager {
    if (!this._instance) {
      this._instance = new BlockManager();
    }
    return this._instance;
  }

  public static getInstance(): BlockManager {
    if (!this._instance) {
      throw new Error('BlockManager has not been initialized');
    }
    // Re-set the lighting orchestrator on the block orchestrator
    this._instance.orchestrator.setLightingOrchestrator(LightingOrchestrator.getInstance());
    return this._instance;
  }

  // Public API
  public getBlockStore(): BlockStore {
    return this.store;
  }

  public getBlockSpatialGrid(): BlockSpatialGrid {
    return this.grid;
  }

  public getBlockOrchestrator(): BlockOrchestrator {
    return this.orchestrator;
  }

  /** Clears all state (blocks, grid, orchestrator). Useful on level reset. */
  public clear(): void {
    this.orchestrator.clear();
    this.grid.clear();
    this.store.clear();
    BlockManager._instance = null;
  }
}
