// src/game/blocks/system/BlockOrchestrator.ts

import { BlockStore } from '@/game/blocks/system/BlockStore';


/**
 * Transform interface for ship positioning and rotation
 */
export interface BlockEntityTransform {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  rotation: number; // in radians
}

/**
 * Parameters for creating a new block
 */
export interface CreateBlockParams {
  ownerShipId: number;
  ownerFaction: number;
  typeIndex: number;
  localX: number;  // ship-relative grid X
  localY: number;  // ship-relative grid Y
  localRotation?: number; // block's local rotation relative to ship
  overlayRotation?: number; // for turrets, etc. not "rotated" with the turret, instead aims to x,y coords.
  blockTypeId?: string; // for looking up armor/hp from registry
}

/**
 * Block registry interface for looking up block type data
 */
export interface BlockRegistry {
  getBlockType(id: string): { armor: number } | undefined;
}

/**
 * Placeholder interface for BlockSpatialGrid
 * (Implementation would depend on your spatial grid system)
 */
export interface BlockSpatialGrid {
  registerBlock(index: number, worldX: number, worldY: number): void;
  deregisterBlock(index: number): void;
  rehomeBlockIndex(index: number, worldX: number, worldY: number): void;
  getBlocksInArea(minX: number, minY: number, maxX: number, maxY: number): Uint32Array;
  clear(): void;
}

/**
 * BlockOrchestrator - Coordination layer for all blocks in the game.
 * Wraps BlockStore (raw SOA arrays) and BlockSpatialGrid (spatial queries)
 * and exposes a ship-aware, high-level API for block management.
 */
export class BlockOrchestrator {
  private store: BlockStore;
  private grid: BlockSpatialGrid;
  private registry?: BlockRegistry;
  
  // Per-ship block management
  private shipBlocks: Map<number, Uint32Array> = new Map();
  private shipBlockCounts: Map<number, number> = new Map();
  
  // Initial capacity for ship block arrays
  private static readonly INITIAL_SHIP_CAPACITY = 32;
  // Maximum blocks per ship (should not exceed BlockStore capacity)
  private static readonly MAX_SHIP_BLOCKS = 1000;

  constructor(store: BlockStore, grid: BlockSpatialGrid, registry?: BlockRegistry) {
    this.store = store;
    this.grid = grid;
    this.registry = registry;
  }

  /**
   * Allocates and initializes a new block for a ship.
   * World positions are set to match local positions initially.
   * Call updateWorldPositions() and registerBlockWithGrid() afterwards.
   * @param params Block creation parameters
   * @returns The block index or -1 on failure
   */
  createBlock(params: CreateBlockParams): number {
    // Allocate index from store
    const index = this.store.allocateIndex();
    if (index === -1) {
      return -1; // Store is at capacity
    }

    // Get initial HP from block registry if available
    let initialHp = 100; // fallback default
    if (this.registry && params.blockTypeId) {
      const blockType = this.registry.getBlockType(params.blockTypeId);
      if (blockType) {
        initialHp = blockType.armor;
      }
    }

    const localRotation = params.localRotation ?? 0;

    // Initialize BlockStore fields
    this.store.ownerShipId[index] = params.ownerShipId;
    this.store.ownerFaction[index] = params.ownerFaction;
    this.store.typeIndex[index] = params.typeIndex;
    this.store.localX[index] = params.localX;
    this.store.localY[index] = params.localY;
    this.store.localRotation[index] = localRotation; // Local rotation relative to ship
    this.store.rotation[index] = localRotation;      // World rotation placeholder (updated later)
    this.store.overlayRotation[index] = params.overlayRotation ?? 0;
    this.store.hp[index] = initialHp;

    // Initialize other state fields
    this.store.destroyed[index] = 0;
    this.store.indestructible[index] = 0;
    this.store.cooldown[index] = 0;
    this.store.hidden[index] = 0;
    this.store.isShielded[index] = 0;
    this.store.shieldEfficiency[index] = 0;
    this.store.shieldHighlightColor[index] = 0;
    this.store.shieldSourceId[index] = -1;

    // Remove: cellKey initialization (grid owns keys now)

    // Add to ship’s block list (enforce per-ship max)
    if (!this.addBlockToShip(params.ownerShipId, index)) {
      // Ship at capacity — recycle the slot and abort
      this.store.freeIndex(index);
      return -1;
    }

    // Initialize world positions as placeholders (properly updated later)
    this.store.worldX[index] = params.localX;
    this.store.worldY[index] = params.localY;

    return index;
  }

  /**
   * Creates a block with immediate world position calculation and spatial grid registration.
   * This is a convenience method that handles the full creation pipeline.
   * @param params Block creation parameters
   * @param shipTransform Current ship transform for world position calculation
   * @returns The block index or -1 on failure
   */
  createAndRegisterBlock(params: CreateBlockParams, shipTransform: BlockEntityTransform): number {
    const index = this.createBlock(params);
    if (index === -1) {
      return -1;
    }

    // Calculate world position for just this block (more efficient than updating entire ship)
    this.setWorldTransformForBlock(index, shipTransform);
    
    // Register with spatial grid
    this.registerBlockWithGrid(index);

    return index;
  }

  /**
   * Destroys a block, deregisters it from ship and grid, and frees its slot.
   * @param index Block index to destroy
   */
  destroyBlock(index: number): void {
    if (index < 0 || index >= this.store.capacity) {
      throw new Error(`Invalid block index: ${index}`);
    }

    const shipId = this.store.ownerShipId[index];

    // Remove from ship's block list
    this.removeBlockFromShip(shipId, index);

    // Deregister from spatial grid
    this.grid.deregisterBlock(index);

    // Free the index in store (this clears all fields to defaults)
    this.store.freeIndex(index);
  }

  /**
   * Updates all world positions for the given ship's blocks, given its transform.
   * @param shipId Ship ID
   * @param transform Ship's current transform
   */
  updateWorldPositions(shipId: number, transform: BlockEntityTransform): void {
    const blockIndices = this.shipBlocks.get(shipId);
    if (!blockIndices) {
      return; // Ship has no blocks
    }

    const count = this.shipBlockCounts.get(shipId) ?? 0;
    if (count === 0) {
      return;
    }

    // Hoist trigonometric calculations once per ship
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);
    const shipX = transform.position.x;
    const shipY = transform.position.y;

    // Update world positions and rotations for all ship blocks
    for (let i = 0; i < count; i++) {
      const blockIndex = blockIndices[i];
      const localX = this.store.localX[blockIndex];
      const localY = this.store.localY[blockIndex];
      const localRotation = this.store.localRotation[blockIndex];

      // Apply 2D rotation and translation for position
      this.store.worldX[blockIndex] = shipX + localX * cos - localY * sin;
      this.store.worldY[blockIndex] = shipY + localX * sin + localY * cos;

      // Compose rotations: ship rotation + local block rotation
      this.store.rotation[blockIndex] = transform.rotation + localRotation;
    }
  }

  /**
   * Rehomes all blocks for a ship in the spatial grid.
   * Delegates cell tracking and key management to BlockSpatialGrid.
   * Should be called after updateWorldPositions if blocks may have changed cells.
   * @param shipId Ship ID
   */
  syncSpatialGrid(shipId: number): void {
    const blockIndices = this.shipBlocks.get(shipId);
    if (!blockIndices) {
      return;
    }

    const count = this.shipBlockCounts.get(shipId) ?? 0;
    if (count === 0) {
      return;
    }

    for (let i = 0; i < count; i++) {
      const blockIndex = blockIndices[i];

      // Tell the grid: "Here’s the updated world position; decide if rehoming is needed."
      this.grid.rehomeBlockIndex(
        blockIndex,
        this.store.worldX[blockIndex],
        this.store.worldY[blockIndex]
      );
    }
  }

  /**
   * Updates world positions and syncs spatial grid in one operation.
   * Convenience method for common update pattern.
   * @param shipId Ship ID
   * @param transform Ship's current transform
   */
  updateShipBlocks(shipId: number, transform: BlockEntityTransform): void {
    this.updateWorldPositions(shipId, transform);
    this.syncSpatialGrid(shipId);
  }

  /**
   * Gets the block indices belonging to a ship.
   * Returns undefined if ship has no blocks yet.
   * @param shipId Ship ID
   * @returns Array of block indices or undefined
   */
  getShipBlocks(shipId: number): Uint32Array | undefined {
    return this.shipBlocks.get(shipId);
  }

  /**
   * Gets a read-only view of the block indices for a ship.
   * @param shipId Ship ID
   * @returns Read-only subarray of block indices, or empty array if none
   */
  getShipBlocksView(shipId: number): Uint32Array {
    const blocks = this.shipBlocks.get(shipId);
    const count = this.shipBlockCounts.get(shipId) ?? 0;
    
    if (!blocks || count === 0) {
      return new Uint32Array(0);
    }
    
    return blocks.subarray(0, count);
  }

  /**
   * Ensures a ship has a block array allocated, creating one if needed.
   * @param shipId Ship ID
   * @returns Array of block indices
   */
  ensureShipBlocks(shipId: number): Uint32Array {
    let blocks = this.shipBlocks.get(shipId);
    if (!blocks) {
      // Create new array for this ship
      blocks = new Uint32Array(BlockOrchestrator.INITIAL_SHIP_CAPACITY);
      this.shipBlocks.set(shipId, blocks);
      this.shipBlockCounts.set(shipId, 0);
    }
    return blocks;
  }

  /**
   * Gets the actual count of blocks for a ship.
   * @param shipId Ship ID
   * @returns Number of active blocks
   */
  getShipBlockCount(shipId: number): number {
    return this.shipBlockCounts.get(shipId) ?? 0;
  }

  /**
   * Removes all blocks for a specific ship.
   * @param shipId Ship ID to clear
   */
  clearShip(shipId: number): void {
    const blockIndices = this.shipBlocks.get(shipId);
    const count = this.shipBlockCounts.get(shipId) ?? 0;
    
    if (!blockIndices || count === 0) {
      return;
    }

    // Destroy all blocks for this ship
    for (let i = 0; i < count; i++) {
      const blockIndex = blockIndices[i];
      this.grid.deregisterBlock(blockIndex);
      this.store.freeIndex(blockIndex);
    }

    // Clear ship's block tracking
    this.shipBlockCounts.set(shipId, 0);
  }

  /**
   * Clears all blocks and resets all ship lists.
   */
  clear(): void {
    this.store.clear();
    this.shipBlocks.clear();
    this.shipBlockCounts.clear();
  }

  /**
   * Legacy compatibility: creates a read-only view of a block for UI/debug.
   * Should be phased out in favor of direct store access.
   * @param index Block index
   * @returns Read-only block view object
   */
  getBlockInstanceView(index: number): any {
    if (index < 0 || index >= this.store.capacity || !this.store.isAllocated(index)) {
      return null;
    }

    return {
      hp: this.store.hp[index],
      ownerShipId: this.store.ownerShipId[index],
      ownerFaction: this.store.ownerFaction[index],
      typeIndex: this.store.typeIndex[index],
      position: {
        localX: this.store.localX[index],
        localY: this.store.localY[index],
        worldX: this.store.worldX[index],
        worldY: this.store.worldY[index]
      },
      rotation: this.store.rotation[index],
      localRotation: this.store.localRotation[index],
      overlayRotation: this.store.overlayRotation[index],
      destroyed: this.store.destroyed[index] === 1,
      indestructible: this.store.indestructible[index] === 1,
      hidden: this.store.hidden[index] === 1,
      cooldown: this.store.cooldown[index],
      isShielded: this.store.isShielded[index] === 1,
      shieldEfficiency: this.store.shieldEfficiency[index],
      shieldHighlightColor: this.store.shieldHighlightColor[index],
      shieldSourceId: this.store.shieldSourceId[index],
    };
  }

  /**
   * Calculates and sets world transform (position and rotation) for a single block.
   * More efficient than updating an entire ship when only one block needs updating.
   * @param index Block index
   * @param transform Ship's current transform
   */
  private setWorldTransformForBlock(index: number, transform: BlockEntityTransform): void {
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);
    const shipX = transform.position.x;
    const shipY = transform.position.y;
    
    const localX = this.store.localX[index];
    const localY = this.store.localY[index];
    const localRot = this.store.localRotation[index];

    // Apply 2D rotation and translation for position
    this.store.worldX[index] = shipX + localX * cos - localY * sin;
    this.store.worldY[index] = shipY + localX * sin + localY * cos;

    // Compose rotations: ship rotation + local block rotation
    this.store.rotation[index] = transform.rotation + localRot;
  }

  /**
   * Packs grid cell coordinates into a single key for efficient comparison.
   * @param cellX Grid cell X coordinate
   * @param cellY Grid cell Y coordinate  
   * @returns Packed cell key
   */
  private packCellKey(cellX: number, cellY: number): number {
    // Simple bit-packing: assume coordinates fit in 16 bits each
    // For larger worlds, you might need a different approach (e.g., string keys)
    return (cellX & 0xFFFF) | ((cellY & 0xFFFF) << 16);
  }
  
  /**
   * @param shipId Ship ID
   * @param blockIndex Block index to add
   * @returns true if successful, false if ship is at capacity
   */
  private addBlockToShip(shipId: number, blockIndex: number): boolean {
    let blocks = this.shipBlocks.get(shipId);
    let count = this.shipBlockCounts.get(shipId) ?? 0;

    // Check if ship would exceed maximum blocks
    if (count >= BlockOrchestrator.MAX_SHIP_BLOCKS) {
      return false;
    }

    if (!blocks) {
      // Create new array for this ship
      blocks = new Uint32Array(BlockOrchestrator.INITIAL_SHIP_CAPACITY);
      this.shipBlocks.set(shipId, blocks);
      count = 0;
    } else if (count >= blocks.length) {
      // Grow array by doubling (but cap at max ship blocks)
      const newCapacity = Math.min(
        blocks.length * 2,
        BlockOrchestrator.MAX_SHIP_BLOCKS
      );
      const newBlocks = new Uint32Array(newCapacity);
      newBlocks.set(blocks);
      blocks = newBlocks;
      this.shipBlocks.set(shipId, blocks);
    }

    // Add block to end of array
    blocks[count] = blockIndex;
    this.shipBlockCounts.set(shipId, count + 1);
    return true;
  }

  /**
   * Removes a block index from a ship's block list using swap-with-last.
   * @param shipId Ship ID
   * @param blockIndex Block index to remove
   */
  private removeBlockFromShip(shipId: number, blockIndex: number): void {
    const blocks = this.shipBlocks.get(shipId);
    const count = this.shipBlockCounts.get(shipId) ?? 0;

    if (!blocks || count === 0) {
      return;
    }

    // Find the block in the array
    let foundIndex = -1;
    for (let i = 0; i < count; i++) {
      if (blocks[i] === blockIndex) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex === -1) {
      return; // Block not found in ship's list
    }

    // Swap with last element and decrement count
    const lastIndex = count - 1;
    if (foundIndex !== lastIndex) {
      blocks[foundIndex] = blocks[lastIndex];
    }

    this.shipBlockCounts.set(shipId, lastIndex);
  }

  /**
   * Registers a newly created block with the spatial grid.
   * The grid handles all cell key calculation and membership internally.
   * @param index Block index to register
   */
  registerBlockWithGrid(index: number): void {
    if (index < 0 || index >= this.store.capacity) {
      throw new Error(`Invalid block index: ${index}`);
    }

    this.grid.registerBlock(
      index,
      this.store.worldX[index],
      this.store.worldY[index]
    );
  }

  // Accessors for underlying systems
  public get blockStore(): BlockStore {
    return this.store;
  }

  public get spatialGrid(): BlockSpatialGrid {
    return this.grid;
  }
}