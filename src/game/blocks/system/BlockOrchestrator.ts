// src/game/blocks/system/BlockOrchestrator.ts

import { BlockStore } from '@/game/blocks/system/BlockStore';

import { getBlockAtlasUVOffset } from '@/rendering/cache/BlockSpriteCache';
import { getDamageLevel } from '@/rendering/cache/BlockSpriteCache';

import { BlockTypesByIndex } from '@/game/blocks/BlockRegistry';
import { BlockCategoryEnum, BlockSubcategoryEnum } from '@/game/interfaces/types/BlockType'

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';

import { createPointLight } from '@/lighting/lights/createPointLight';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

const BLOCK_SIZE = 32;

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
  group?: number;
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
  bulkRemoveBlocks(cellKey: number, toRemove: Uint32Array, removeCount: number): void;
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
  private lightingOrchestrator: LightingOrchestrator | null = null;

  // Per-ship block management
  private shipBlocks: Map<number, Uint32Array> = new Map();
  private shipBlockCounts: Map<number, number> = new Map();
  
  // Initial capacity for ship block arrays
  private static readonly INITIAL_SHIP_CAPACITY = 32;
  // Maximum blocks per ship (should not exceed BlockStore capacity)
  private static readonly MAX_SHIP_BLOCKS = 2000;

  // Dedicated scratch buffer for AoE grid-distance queries
  private static readonly SCRATCH_BLOCKS_GRID_DISTANCE = new Uint32Array(2048);
  private scratchCountBlocksGridDistance = 0;

  // Dedicated scratch buffer and counter for ship block group queries
  private static SCRATCH_SHIP_GROUP: Uint32Array = new Uint32Array(2048);
  private scratchCountShipGroup = 0;

  // ── Pooled scratch for clearShip ─────────────────────────────
  private scratchClearShip: Uint32Array = new Uint32Array(1024);      // indices to remove (per-cell)
  private scratchAffectedCells: Uint32Array = new Uint32Array(128);   // unique cell keys touched by this ship
  private scratchAffectedCellsCount = 0;

  private ensureU32Capacity(buf: Uint32Array, needed: number, minStart = 128): Uint32Array {
    if (buf.length >= needed) return buf;
    // Geometric growth; avoid tiny sizes
    let cap = Math.max(buf.length || minStart, minStart);
    while (cap < needed) cap <<= 1;
    return new Uint32Array(cap);
  }

  constructor(store: BlockStore, grid: BlockSpatialGrid, registry?: BlockRegistry) {
    this.store = store;
    this.grid = grid;
  }

  createBlock(params: CreateBlockParams): number {
    const index = this.store.allocateIndex();
    if (index === -1) return -1;

    const blockType = BlockTypesByIndex[params.typeIndex];
    const blockTypeArmor = blockType?.armor ?? 100;
    const initialHp = blockTypeArmor;

    const localRotDeg = params.localRotation ?? 0;
    const localRot = (Math.PI / 180) * localRotDeg;

    const overlayRotDeg = params.overlayRotation ?? 0;
    const overlayRot = (Math.PI / 180) * overlayRotDeg;

    const s = this.store;
    s.ownerShipId[index] = params.ownerShipId;
    s.ownerFaction[index] = params.ownerFaction;
    s.typeIndex[index] = params.typeIndex;

    // New: flatten BlockType attributes into SOA
    if (blockType) {
      const categoryCode = BlockCategoryEnum[
        (blockType.category.charAt(0).toUpperCase() + blockType.category.slice(1)) as keyof typeof BlockCategoryEnum
      ] ?? 0;

      const subcategoryCode = blockType.subcategory
        ? BlockSubcategoryEnum[
            (blockType.subcategory.charAt(0).toUpperCase() + blockType.subcategory.slice(1)) as keyof typeof BlockSubcategoryEnum
          ] ?? 0
        : 0;

      s.categoryCode[index] = categoryCode;
      s.subcategoryCode[index] = subcategoryCode;
      s.dropRate[index] = blockType.dropRate ?? 0;
      s.tier[index] = blockType.tier ?? 0;
    } else {
      // Default values for safety
      s.categoryCode[index] = 0;
      s.subcategoryCode[index] = 0;
      s.dropRate[index] = 0;
      s.tier[index] = 0;
    }

    // Coordinates and rotation
    s.localX[index] = params.localX;
    s.localY[index] = params.localY;
    s.localRotation[index] = localRot;
    s.rotation[index] = localRot;
    s.overlayRotation[index] = overlayRot;

    // Group
    s.group[index] = params.group ?? 0;

    // HP, armor, atlas
    s.hp[index] = initialHp;
    s.armor[index] = blockTypeArmor;
    s.atlasKey[index] = params.typeIndex;

    // Thrusting
    s.thrustPower[index] = blockType?.behavior?.thrustPower ?? 0;
    s.canThrust[index] = blockType?.behavior?.canThrust ? 1 : 0;
    s.turnPower[index] = blockType?.behavior?.turnPower ?? 0;

    // Default state
    s.destroyed[index] = 0;
    s.indestructible[index] = 0;
    s.cooldown[index] = 0;
    s.hidden[index] = 0;
    s.isShielded[index] = 0;
    s.shieldEfficiency[index] = 0;
    s.shieldHighlightColor[index] = 0;
    s.shieldSourceId[index] = -1;
    s.shieldEnergyDrain[index] = blockType?.behavior?.shieldEnergyDrain ?? 0;
    s.shieldRadius[index] = blockType?.behavior?.shieldRadius ?? 0;
    s.visible[index] = 1;

    // Fire attributes
    s.fireDamage[index] = blockType?.behavior?.fire?.fireDamage ?? 0;
    s.fireRate[index] = blockType?.behavior?.fire?.fireRate ?? 0;
    s.projectileSpeed[index] = blockType?.behavior?.fire?.projectileSpeed ?? 0;
    s.projectileLifetime[index] = blockType?.behavior?.fire?.lifetime ?? 0;
    s.explosionDamage[index] = blockType?.behavior?.fire?.explosionDamage ?? 0;
    s.explosionRadiusBlocks[index] = blockType?.behavior?.fire?.explosionRadiusBlocks ?? 0;
    s.targetingRange[index] = blockType?.behavior?.fire?.targetingRange ?? 0;
    s.fireTurningPower[index] = blockType?.behavior?.fire?.turningPower ?? 0;

    // Weapon specific
    s.seekerForwardFire[index] = blockType?.behavior?.fire?.seekerForwardFire ? 1 : 0;

    // UV offsets for rendering
    const damageLevel = getDamageLevel(initialHp, blockTypeArmor);
    const atlasUV = getBlockAtlasUVOffset(params.typeIndex, damageLevel);
    s.uvBaseX[index] = atlasUV.baseUV[0];
    s.uvBaseY[index] = atlasUV.baseUV[1];
    s.uvOverlayX[index] = atlasUV.overlayUV?.[0] ?? -1;
    s.uvOverlayY[index] = atlasUV.overlayUV?.[1] ?? -1;

    // Attach to ship's block list; free the index if it fails
    if (!this.addBlockToShip(params.ownerShipId, index)) {
      s.freeIndex(index);
      return -1;
    }

    // If light, create a pointlight and store the id
    if (blockType?.lightColor) {
      const lightId = createPointLight({
        x: params.localX,
        y: params.localY,
        radius: blockType.lightRadius ?? 128,
        color: blockType.lightColor,
        intensity: blockType.lightIntensity ?? 1.0,
        life: 999999,
        expires: true,
      });

      if (lightId !== null) {
        s.lightId[index] = lightId;
      }
    }

    // World positions will be updated later by transform logic
    s.worldX[index] = params.localX;
    s.worldY[index] = params.localY;

    return index;
  }

  /** 
   * Updates the damage UV for a block. Assumes `armor` and `atlasKey` were pre-populated when the block was created.
   */
  updateDamageUV(blockIndex: number): void {
    const s = this.store;

    // Skip unallocated or invalid atlas keys
    if (!s.isAllocated(blockIndex) || s.atlasKey[blockIndex] < 0) {
      return;
    }

    const hp = s.hp[blockIndex];
    const armor = s.armor[blockIndex];

    // Clamp to avoid NaN if armor is 0
    const damageLevel = getDamageLevel(Math.max(0, hp), Math.max(1, armor));
    const atlasUV = getBlockAtlasUVOffset(s.atlasKey[blockIndex], damageLevel);

    s.uvBaseX[blockIndex] = atlasUV.baseUV[0];
    s.uvBaseY[blockIndex] = atlasUV.baseUV[1];
    s.uvOverlayX[blockIndex] = atlasUV.overlayUV?.[0] ?? -1;
    s.uvOverlayY[blockIndex] = atlasUV.overlayUV?.[1] ?? -1;
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
   * Scales local grid coordinates by BLOCK_SIZE so blocks are spaced correctly.
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

    // Precompute trig and ship transform values once per ship
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);
    const shipX = transform.position.x;
    const shipY = transform.position.y;

    // Update world positions and rotations for all ship blocks
    for (let i = 0; i < count; i++) {
      const blockIndex = blockIndices[i];
      
      // Scale local grid coordinates by BLOCK_SIZE
      const localX = this.store.localX[blockIndex] * BLOCK_SIZE;
      const localY = this.store.localY[blockIndex] * BLOCK_SIZE;
      const localRotation = this.store.localRotation[blockIndex];

      // Rotate around ship origin and translate to world position
      this.store.worldX[blockIndex] = shipX + localX * cos - localY * sin;
      this.store.worldY[blockIndex] = shipY + localX * sin + localY * cos;

      // Combine ship rotation and block’s own rotation
      this.store.rotation[blockIndex] = transform.rotation + localRotation;

      // If light, update its position
      if (this.store.lightId[blockIndex] !== -1) {
        this.lightingOrchestrator!.updateLight(this.store.lightId[blockIndex], {
          x: this.store.worldX[blockIndex],
          y: this.store.worldY[blockIndex],
        });
      }
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
   * Gets the block indices belonging to a ship in a specific group.
   * @param shipId Ship ID
   * @param group Group index
   * @returns Array of block indices
   */
  getShipBlocksInGroup(shipId: number, group: number): Uint32Array {
    const blocks = this.shipBlocks.get(shipId);
    const count = this.shipBlockCounts.get(shipId) ?? 0;
    const store = this.store;

    this.scratchCountShipGroup = 0;

    if (!blocks || count === 0) {
      return BlockOrchestrator.SCRATCH_SHIP_GROUP.subarray(0, 0);
    }

    for (let i = 0; i < count; i++) {
      const idx = blocks[i];
      if (store.group[idx] === group) {
        BlockOrchestrator.SCRATCH_SHIP_GROUP[this.scratchCountShipGroup++] = idx;
      }
    }

    return BlockOrchestrator.SCRATCH_SHIP_GROUP.subarray(0, this.scratchCountShipGroup);
  }

  /**
   * Gets the block indices belonging to a ship across multiple groups.
   * @param shipId Ship ID
   * @param groups List of group indices (0–255)
   * @returns Array of block indices
   */
  getShipBlocksInGroups(shipId: number, groups: readonly number[] | Uint8Array): Uint32Array {
    const blocks = this.shipBlocks.get(shipId);
    const count = this.shipBlockCounts.get(shipId) ?? 0;
    const store = this.store;

    this.scratchCountShipGroup = 0;

    if (!blocks || count === 0 || groups.length === 0) {
      return BlockOrchestrator.SCRATCH_SHIP_GROUP.subarray(0, 0);
    }

    // Optimization: create a lookup table for fast group inclusion check
    const groupSet = new Uint8Array(256);
    for (let i = 0; i < groups.length; i++) {
      groupSet[groups[i] & 0xff] = 1;
    }

    for (let i = 0; i < count; i++) {
      const idx = blocks[i];
      const group = store.group[idx];
      if (groupSet[group]) {
        BlockOrchestrator.SCRATCH_SHIP_GROUP[this.scratchCountShipGroup++] = idx;
      }
    }

    return BlockOrchestrator.SCRATCH_SHIP_GROUP.subarray(0, this.scratchCountShipGroup);
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
   * Gets the raw, mutable array of block indices for a ship.
   * @param shipId Ship ID
   * @returns 
   */
  getShipBlocksRawArray(shipId: number): Uint32Array | undefined {
    return this.shipBlocks.get(shipId); // return the backing buffer directly
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
   * Gets all block indices within a grid distance of a center coordinate for a specific composite block object.
   * @param compositeBlockObject Target object
   * @param centerCoord Center coordinate
   * @param radius Grid distance radius
   * @returns Array of block indices
   */
  getBlocksWithinGridDistanceForCompositeBlockObject(
    compositeBlockObject: CompositeBlockObject,
    centerCoord: GridCoord,
    radius: number
  ): Uint32Array {
    const store = this.store;
    const indices = compositeBlockObject.getAllBlockIndices();

    this.scratchCountBlocksGridDistance = 0;

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];

      const dx = Math.abs(store.localX[idx] - centerCoord.x);
      const dy = Math.abs(store.localY[idx] - centerCoord.y);
      const gridDistance = Math.max(dx, dy);

      if (gridDistance <= radius) {
        BlockOrchestrator.SCRATCH_BLOCKS_GRID_DISTANCE[this.scratchCountBlocksGridDistance++] = idx;
      }
    }

    return BlockOrchestrator.SCRATCH_BLOCKS_GRID_DISTANCE.subarray(
      0,
      this.scratchCountBlocksGridDistance
    );
  }

/**
   * Removes all blocks for a specific ship.
   * Uses BlockSpatialGrid.bulkRemoveBlocks to avoid swap-with-last corruption.
   * GC-neutral via pooled scratch buffers.
   * @param shipId Ship ID to clear
   */
  clearShip(shipId: number): void {
    const blockIndices = this.shipBlocks.get(shipId);
    const count = this.shipBlockCounts.get(shipId) ?? 0;
    if (!blockIndices || count === 0) return;

    const grid  = this.grid as any;
    const store = this.store;

    // Hot references (no GC impact, just fewer property walks)
    const blockToCellKey: Uint32Array | Int32Array = grid.blockToCellKey;
    const cells = grid.cells;
    const cellCounts = grid.cellCounts;

    // Ensure pooled buffers are large enough for worst-case usage in this call
    this.scratchClearShip     = this.ensureU32Capacity(this.scratchClearShip, count);
    this.scratchAffectedCells = this.ensureU32Capacity(this.scratchAffectedCells, count);
    this.scratchAffectedCellsCount = 0;

    // 1) Collect unique affected cell keys (pooled linear de-dupe)
    //    In practice, #unique cells per ship is far smaller than block count.
    for (let i = 0; i < count; i++) {
      const idx     = blockIndices[i];
      const cellKey = blockToCellKey[idx];
      if (cellKey === -1) continue;

      // Linear de-dupe into scratchAffectedCells[0..scratchAffectedCellsCount)
      let found = false;
      for (let k = 0; k < this.scratchAffectedCellsCount; k++) {
        if (this.scratchAffectedCells[k] === cellKey) { found = true; break; }
      }
      if (!found) {
        if (this.scratchAffectedCellsCount >= this.scratchAffectedCells.length) {
          this.scratchAffectedCells = this.ensureU32Capacity(this.scratchAffectedCells, this.scratchAffectedCellsCount + 1);
        }
        this.scratchAffectedCells[this.scratchAffectedCellsCount++] = cellKey;
      }
    }

    // 2) For each affected cell, compact a removal list into the pooled buffer and bulk-remove
    for (let c = 0; c < this.scratchAffectedCellsCount; c++) {
      const cellKey    = this.scratchAffectedCells[c];
      const cellBlocks = cells.get(cellKey);
      const cellCount  = cellCounts.get(cellKey) ?? 0;
      if (!cellBlocks || cellCount === 0) continue;

      let removeCount = 0;
      // Collect this ship's indices that currently live in this cell
      for (let i = 0; i < count; i++) {
        const idx = blockIndices[i];
        if (blockToCellKey[idx] === cellKey) {
          this.scratchClearShip[removeCount++] = idx;
        }
      }

      if (removeCount > 0) {
        this.grid.bulkRemoveBlocks(cellKey, this.scratchClearShip, removeCount);
      }
    }

    // 3) Remove lights and free indices in the store
    for (let i = 0; i < count; i++) {
      const idx = blockIndices[i];
      const lightId = store.lightId[idx];
      if (lightId !== -1) {
        this.lightingOrchestrator?.removeLight(lightId);
      }
      store.freeIndex(idx);
    }

    // 4) Reset ship block count (buffer is retained for reuse)
    this.shipBlockCounts.set(shipId, 0);
  }

  /**
   * Clears all blocks and resets all ship lists.
   */
  clear(): void {
    this.store.clear();
    this.shipBlocks.clear();
    this.shipBlockCounts.clear();
    if (this.lightingOrchestrator) {
      this.lightingOrchestrator = null;
    }
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
      group: this.store.group[index],
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

    // Scale local grid coordinates to pixel units (BLOCK_SIZE) just like updateWorldPositions
    const localX = this.store.localX[index] * BLOCK_SIZE;
    const localY = this.store.localY[index] * BLOCK_SIZE;
    const localRot = this.store.localRotation[index];

    // Apply rotation around ship origin and translate to world space
    this.store.worldX[index] = shipX + localX * cos - localY * sin;
    this.store.worldY[index] = shipY + localX * sin + localY * cos;

    // Combine ship rotation and block’s own rotation
    this.store.rotation[index] = transform.rotation + localRot;
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

    // Remove light if exists
    if (this.store.lightId[blockIndex] !== -1) {
      this.lightingOrchestrator?.removeLight(this.store.lightId[blockIndex]);
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

  // Ship Helpers
  /**
   * Updates the faction for all blocks belonging to a ship.
   * Ensures BlockStore.ownerFaction is kept consistent.
   * @param shipId Ship ID
   * @param factionIndex Numeric faction index (e.g., from FACTION_TO_INDEX)
   */
  public setShipFaction(shipId: number, factionIndex: number): void {
    const buf   = this.getShipBlocksRawArray(shipId);
    const count = this.getShipBlockCount(shipId);
    if (!buf || count === 0) return;

    const store = this.store;
    for (let i = 0; i < count; i++) {
      store.ownerFaction[buf[i]] = factionIndex;
    }
  }


  public setLightingOrchestrator(lightingOrchestrator: LightingOrchestrator): void {
    this.lightingOrchestrator = lightingOrchestrator;
  }

  public setShipColor(shipId: number, r: number, g: number, b: number, a: number = 1): void {
    const buf   = this.getShipBlocksRawArray(shipId);
    const count = this.getShipBlockCount(shipId);
    if (!buf || count === 0) return;

    const store = this.store;
    for (let i = 0; i < count; i++) {
      const idx = buf[i];
      store.colorR[idx] = r;
      store.colorG[idx] = g;
      store.colorB[idx] = b;
      store.colorA[idx] = a;
    }
  }
}
