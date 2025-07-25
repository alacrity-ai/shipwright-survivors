// src/game/entities/CompositeBlockObject.ts

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { SerializedBlockObject } from '@/systems/serialization/CompositeBlockObjectSerializer';

import { BlockManager } from '../blocks/system/BlockManager';
import type { BlockOrchestrator } from '@/game/blocks/system/BlockOrchestrator';
import type { BlockStore } from '@/game/blocks/system/BlockStore';
import { FACTION_TO_INDEX } from '@/game/interfaces/types/Faction';

import { hashStringToInt32 } from '@/shared/hashUtils';
import { hexToRgbaVec4 } from '@/rendering/unified/helpers/hexToRgbaVec4';
import { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

import { BlockSpatialGrid } from '../blocks/system/BlockSpatialGrid';
import { getBlockType, BlockTypeIndex, BlockTypeMass } from '@/game/blocks/BlockRegistry';

import { Faction } from '@/game/interfaces/types/Faction';
import { AnchorPointComponent } from '@/game/ship/anchors/AnchorPointComponent';


export abstract class CompositeBlockObject {
  readonly id: string;
  readonly numericId: number;

  protected blockManager: BlockManager;
  protected blockOrchestrator: BlockOrchestrator;

  protected transform: BlockEntityTransform;
  protected destroyed: boolean = false;
  protected deathTimestamp: number | null = null;

  protected totalMass: number | null = null;
  protected immoveable: boolean = false;

  protected faction: Faction;

  protected collidingUntil: number = 0;

  protected blockColor: string | null = null;
  protected blockColorIntensity: number = 0.5;

  protected noClip: boolean = false;

  protected anchorPointComponent: AnchorPointComponent | null = null;

  private _lastTransformCheckX: number = NaN;
  private _lastTransformCheckY: number = NaN;
  private _lastTransformCheckRot: number = NaN; // optional

  constructor(
    initialBlocks?: Array<{ coord: GridCoord; typeId: string; rotation?: number }>,
    initialTransform?: Partial<BlockEntityTransform>,
    faction?: Faction
  ) {
    const ids = this.generateId();
    this.id = ids.stringId;
    this.numericId = ids.numericId;
    this.faction = faction ?? Faction.Neutral;

    this.blockManager = BlockManager.getInstance();
    this.blockOrchestrator = this.blockManager.getBlockOrchestrator();

    this.transform = {
      position: initialTransform?.position ?? { x: 0, y: 0 },
      velocity: initialTransform?.velocity ?? { x: 0, y: 0 },
      rotation: initialTransform?.rotation ?? 0,
      angularVelocity: initialTransform?.angularVelocity ?? 0,
    };

    // Preallocate SOA slot list for this ship
    this.blockOrchestrator.ensureShipBlocks(this.numericId);

    if (initialBlocks) {
      for (const { coord, typeId, rotation } of initialBlocks) {
        const typeIndex = BlockTypeIndex[typeId] ?? 0;
        this.blockOrchestrator.createAndRegisterBlock(
          {
            ownerShipId: this.numericId,
            ownerFaction: FACTION_TO_INDEX[this.faction],
            typeIndex,
            localX: coord.x,
            localY: coord.y,
            localRotation: rotation ?? 0,
            blockTypeId: typeId,
          },
          this.transform
        );
      }
    }

    // Ensure positions and grid registration are correct immediately
    this.blockOrchestrator.updateShipBlocks(this.numericId, this.transform);
  }

  public isConstructed(): boolean {
    return true;
  }

  /** Subclass must define entity update logic */
  public update(dt: number): void {};

  /** Optional: behavior when destroyed */
  public onDestroyed(): void {};

  // Faction System
  public setFaction(faction: Faction): void {
    this.faction = faction;

    // Mirror to SOA system
    const factionIndex = FACTION_TO_INDEX[faction];
    this.blockOrchestrator.setShipFaction(this.numericId, factionIndex);
  }

  public getFaction(): Faction {
    return this.faction;
  }

  // Convenience to avoid instanceof checks
  public getIsPlayerShip(): boolean {
    return false;
  }

  // --- Block Access & Placement ---

  /**
   * Places a block at the given grid coordinate and returns its SOA index.
   * @param coord Local grid coordinate (relative to the ship)
   * @param typeId Block type identifier
   * @param rotation Optional local rotation (radians)
   * @returns The SOA index of the created block, or -1 if allocation failed
   */
  public placeBlock(coord: GridCoord, typeId: string, rotation: number = 0): number {
    const typeIndex = BlockTypeIndex[typeId] ?? 0;
    const factionIndex = FACTION_TO_INDEX[this.faction];

    const idx = this.blockOrchestrator.createAndRegisterBlock(
      {
        ownerShipId: this.numericId,
        ownerFaction: factionIndex,
        typeIndex,
        localX: coord.x,
        localY: coord.y,
        localRotation: rotation,
        blockTypeId: typeId,
      },
      this.transform
    );

    if (idx !== -1) {
      this.invalidateMass(); // Recalculate ship mass lazily
    }

    return idx;
  }

  public getBlockIndex(coord: GridCoord): number | undefined {
    const indices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    const store = this.blockManager.getBlockStore();

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (store.localX[idx] === coord.x && store.localY[idx] === coord.y) {
        return idx;
      }
    }
    return undefined;
  }

  public getRandomBlockIndex(): number | undefined {
    const indices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    if (indices.length === 0) return undefined;

    return indices[Math.floor(Math.random() * indices.length)];
  }

  public hasBlockAt(coord: GridCoord): boolean {
    const indices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    const store = this.blockManager.getBlockStore();

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (store.localX[idx] === coord.x && store.localY[idx] === coord.y) {
        return true;
      }
    }
    return false;
  }

  // --- Clipping

  public setNoClip(value: boolean): void {
    this.noClip = value;
  }

  public isNoClip(): boolean {
    return this.noClip;
  }

  // --- Affixes Placeholder to avoid heavy use of typeOf
  public getAffixes(): ShipAffixes {
    return {};
  }

  public getBlockStore(): BlockStore {
    return this.blockManager.getBlockStore();
  }

  public getBlockOrchestrator(): BlockOrchestrator {
    return this.blockManager.getBlockOrchestrator();
  }

  public getAllBlockIndices(): Uint32Array {
    // Always use the orchestrator’s existing subarray — no caching/allocation needed.
    return this.blockOrchestrator.getShipBlocksView(this.numericId);
  }

  public getBlockCount(): number {
    // Use the orchestrator’s block tracking (SOA)
    return this.blockOrchestrator.getShipBlockCount(this.numericId);
  }

  public getBlockCoordByIndex(idx: number): GridCoord {
    const store = this.blockManager.getBlockStore();
    return { x: store.localX[idx], y: store.localY[idx] };
  }

  public getBlocksWithinGridDistance(centerCoord: GridCoord, distance: number): Uint32Array {
    const store = this.blockManager.getBlockStore();
    const grid = this.blockManager.getBlockSpatialGrid();
    
    // Compute an approximate world-space bounding box around the query
    // (Assuming each grid cell is BLOCK_SIZE in size, typically 32px)
    const BLOCK_SIZE = 32; 
    const minX = (centerCoord.x - distance - 1) * BLOCK_SIZE;
    const maxX = (centerCoord.x + distance + 1) * BLOCK_SIZE;
    const minY = (centerCoord.y - distance - 1) * BLOCK_SIZE;
    const maxY = (centerCoord.y + distance + 1) * BLOCK_SIZE;

    // Broad-phase: get candidate block indices in the area
    const candidates = grid.getBlocksInArea(minX, minY, maxX, maxY);

    // Narrow-phase: filter by actual grid distance (local coords)
    const results: number[] = [];
    for (let i = 0; i < candidates.length; i++) {
      const idx = candidates[i];
      const dx = Math.abs(store.localX[idx] - centerCoord.x);
      const dy = Math.abs(store.localY[idx] - centerCoord.y);
      const gridDistance = Math.max(dx, dy);

      if (gridDistance <= distance) {
        results.push(idx);
      }
    }

    return Uint32Array.from(results);
  }

  public hideAllBlocks(): void {
    const indices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    const store = this.blockManager.getBlockStore();
    for (let i = 0; i < indices.length; i++) {
      store.hidden[indices[i]] = 1;
    }
  }

  public showAllBlocks(): void {
    const indices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    const store = this.blockManager.getBlockStore();
    for (let i = 0; i < indices.length; i++) {
      store.hidden[indices[i]] = 0;
    }
  }

  /**
   * Removes a block at the given local grid coordinate (if it exists).
   * Operates entirely on SOA indices — no BlockInstance.
   */
  public removeBlock(coord: GridCoord): void {
    const indices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    const store = this.blockManager.getBlockStore();

    // Find the block index matching the coordinate
    let foundIdx: number | undefined;
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (store.localX[idx] === coord.x && store.localY[idx] === coord.y) {
        foundIdx = idx;
        break;
      }
    }

    if (foundIdx === undefined) return;

    // Destroy the block (handles deregistration from BlockSpatialGrid + frees store slot)
    this.blockOrchestrator.destroyBlock(foundIdx);

    // Invalidate cached mass (ship weight) so it recalculates next time
    this.invalidateMass();
  }

  /**
   * Removes multiple blocks by their local grid coordinates.
   * Operates entirely on SOA indices — no BlockInstance.
   */
  public removeBlocks(coords: GridCoord[]): void {
    const indices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    const store = this.blockManager.getBlockStore();

    for (const coord of coords) {
      // Find matching block index for each coordinate
      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];
        if (store.localX[idx] === coord.x && store.localY[idx] === coord.y) {
          this.blockOrchestrator.destroyBlock(idx);
          break; // Move to next coord after removing the first match
        }
      }
    }

    // Recalculate mass next time it's queried
    this.invalidateMass();
  }

  // --- Color customization (RGBA)
  public setBlockColor(color: string | null): void {
    this.blockColor = color;

    if (color) {
      const [r, g, b] = hexToRgbaVec4(color);
      this.blockOrchestrator.setShipColor(this.numericId, r, g, b, 1);
    }
  }

  public getBlockColor(): string | null {
    return this.blockColor;
  }

  public setBlockColorIntensity(intensity: number): void {
    this.blockColorIntensity = intensity;
  }

  public getBlockColorIntensity(): number {
    return this.blockColorIntensity;
  }

  // --- Spatial Access ---

  public getTransform(): BlockEntityTransform {
    return this.transform;
  }

  public setTransform(newTransform: BlockEntityTransform): void {
    this.transform = { ...newTransform };

    // Update SOA system (positions + rehome in BlockSpatialGrid)
    if (this.blockOrchestrator) {
      this.blockOrchestrator.updateShipBlocks(this.numericId, this.transform);
    }
  }

  public getVelocity(): { x: number; y: number } {
    return this.transform.velocity;
  }

  public getGrid(): BlockSpatialGrid {
    return this.blockManager.getBlockSpatialGrid();
  }

  public setImmoveable(value: boolean): void {
    this.immoveable = value;
  }

  public isImmoveable(): boolean {
    return this.immoveable;
  }

  /* == Anchor Points (For probabilistic mitigation of enemy "stacking")
   An anchor point effectively gives an enemy ship multiple "targets" to chase after */

  public initializeAnchorPoints(): void {
    if (!this.anchorPointComponent) {
      this.anchorPointComponent = new AnchorPointComponent(this.id);
    }
    this.anchorPointComponent.updateFromTransform(this.getTransform());
  }

  /** Assigns an anchor index for an enemy. Returns -1 if no anchor component. */
  public assignAnchorIndex(): number {
    return this.anchorPointComponent
      ? this.anchorPointComponent.getAnchorPointAssignment()
      : -1;
  }

  /** Releases a previously assigned anchor index. */
  public releaseAnchorIndex(index: number): void {
    if (this.anchorPointComponent && index >= 0) {
      this.anchorPointComponent.releaseAnchor(index);
    }
  }

  public getAnchorPointX(index: number): number {
    return this.anchorPointComponent ? this.anchorPointComponent.getAnchorX(index) : 0;
  }

  public getAnchorPointY(index: number): number {
    return this.anchorPointComponent ? this.anchorPointComponent.getAnchorY(index) : 0;
  }

  public hasAnchorPoints(): boolean {
    return !!this.anchorPointComponent;
  }

  // State // Movement // Positional States

  public hasMovedSinceLastUpdate(): boolean {
    const transform = this.getTransform();
    const x = transform.position.x;
    const y = transform.position.y;
    const rot = transform.rotation ?? 0;

    const moved =
      x !== this._lastTransformCheckX ||
      y !== this._lastTransformCheckY ||
      rot !== this._lastTransformCheckRot;

    return moved;
  }

  public markTransformChecked(): void {
    const transform = this.getTransform();
    this._lastTransformCheckX = transform.position.x;
    this._lastTransformCheckY = transform.position.y;
    this._lastTransformCheckRot = transform.rotation ?? 0;
  }

  public setColliding(active: boolean, durationMs: number = 100): void {
    if (active) {
      this.collidingUntil = performance.now() + durationMs;
    }
  }

  public isColliding(): boolean {
    return performance.now() < this.collidingUntil;
  }

  /**
   * Returns the world-space position of a block by its SOA index.
   * @param idx Block index in BlockStore
   * @returns World position { x, y }
   */
  public getBlockWorldPositionByIndex(idx: number): { x: number; y: number } {
    const store = this.blockManager.getBlockStore();
    return { x: store.worldX[idx], y: store.worldY[idx] };
  }

  // Helper for effects on blocks
  public getRandomBlockWorldPosition(): { x: number; y: number } {
    const indices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    if (indices.length === 0) return { x: 0, y: 0 };

    const randomIdx = indices[Math.floor(Math.random() * indices.length)];
    const store = this.blockManager.getBlockStore();

    return { x: store.worldX[randomIdx], y: store.worldY[randomIdx] };
  }

  /**
   * Calculates the world-space position of a block by its local grid coordinate.
   * Looks up the block via its coordinate and returns its world position from BlockStore.
   */
  protected calculateBlockWorldPosition(coord: GridCoord): { x: number; y: number } {
    const indices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    const store = this.blockManager.getBlockStore();

    // Find the block index with this local coordinate
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (store.localX[idx] === coord.x && store.localY[idx] === coord.y) {
        return { x: store.worldX[idx], y: store.worldY[idx] };
      }
    }

    // If no block found, default to origin
    return { x: 0, y: 0 };
  }

  /**
   * Updates all block world positions and rehomes them in the spatial grid.
   * Also updates any attached anchor point component.
   */
  public updateBlockPositions(): void {
    // Update SOA positions and handle spatial rehoming via BlockOrchestrator
    this.blockOrchestrator.updateShipBlocks(this.numericId, this.transform);

    // Update anchor points (used for AI targeting, etc.)
    if (this.anchorPointComponent) {
      this.anchorPointComponent.updateFromTransform(this.transform);
    }
  }

  // --- Mass ---
  public getTotalMass(): number {
    if (this.totalMass != null) {
      return this.totalMass;
    }

    let total = 0;

    // Prefer SOA iteration for performance
    const shipIndices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    const store = this.blockManager.getBlockStore();

    for (let i = 0; i < shipIndices.length; i++) {
      const idx = shipIndices[i];
      const typeIdx = store.typeIndex[idx];
      total += BlockTypeMass[typeIdx];
    }

    this.totalMass = total;
    return total;
  }

  protected invalidateMass(): void {
    this.totalMass = null;
  }

  // --- Destruction Lifecycle ---

  /**
   * Marks the ship as destroyed, clears all blocks, and triggers destruction hooks.
   */
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.deathTimestamp = performance.now();

    // Clear all blocks for this ship (handles BlockStore + BlockSpatialGrid teardown)
    this.blockOrchestrator.clearShip(this.numericId);

    // Notify any subclass-specific destruction logic
    this.onDestroyed();
  }

  public isDestroyed(): boolean {
    return this.destroyed;
  }

  public isVisuallyExpired(durationMs = 2000): boolean {
    if (!this.destroyed || this.deathTimestamp === null) return false;
    return performance.now() - this.deathTimestamp > durationMs;
  }

  public getTimeSinceDeath(): number {
    if (!this.destroyed || this.deathTimestamp === null) return 0;
    return performance.now() - this.deathTimestamp;
  }

  // --- Connectivity Check ---

  public isDeletionSafeSOA(removeCoord: GridCoord): boolean {
    const indices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    if (indices.length === 0) return true;

    const store = this.blockOrchestrator.blockStore;

    // Build a map of remaining coords
    const coords: Array<{ x: number; y: number; index: number }> = [];
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const x = store.localX[idx];
      const y = store.localY[idx];
      if (x === removeCoord.x && y === removeCoord.y) continue;
      coords.push({ x, y, index: idx });
    }
    if (coords.length === 0) return true;

    // BFS connectivity traversal
    const visited = new Set<string>();
    const toKey = (x: number, y: number) => `${x},${y}`;
    const start = toKey(coords[0].x, coords[0].y);
    const queue = [start];
    const coordSet = new Set(coords.map(c => toKey(c.x, c.y)));

    while (queue.length > 0) {
      const key = queue.pop()!;
      if (visited.has(key)) continue;
      visited.add(key);

      const [cx, cy] = key.split(',').map(Number);
      const neighbors = [
        `${cx + 1},${cy}`,
        `${cx - 1},${cy}`,
        `${cx},${cy + 1}`,
        `${cx},${cy - 1}`,
      ];
      for (const n of neighbors) {
        if (coordSet.has(n) && !visited.has(n)) queue.push(n);
      }
    }

    return visited.size === coords.length;
  }

  // --- Misc ---

  public loadFromJson(data: SerializedBlockObject): void {
    const { position, velocity, rotation, angularVelocity } = data.transform;

    this.transform.position = position;
    this.transform.velocity = velocity;
    this.transform.rotation = rotation;
    this.transform.angularVelocity = angularVelocity;

    // Ensure a block list is allocated for this ship in the orchestrator
    this.blockOrchestrator.ensureShipBlocks(this.numericId);

    // Create all blocks directly in SOA
    for (const blockData of data.blocks) {
      const type = getBlockType(blockData.id);
      if (!type) {
        console.warn(`Unknown block type during deserialization: ${blockData.id}`);
        continue;
      }

      const typeIndex = BlockTypeIndex[type.id] ?? 0;

      this.blockOrchestrator.createAndRegisterBlock(
        {
          ownerShipId: this.numericId,
          ownerFaction: FACTION_TO_INDEX[this.faction],
          typeIndex,
          localX: blockData.coord.x,
          localY: blockData.coord.y,
          localRotation: blockData.rotation ?? 0,
          blockTypeId: type.id,
        },
        this.transform
      );
    }

    // Recompute derived state
    this.invalidateMass();

    // Sync world transforms and spatial grid registration
    this.blockOrchestrator.updateShipBlocks(this.numericId, this.transform);
  }

  protected generateId(): { stringId: string; numericId: number } {
    const stringId = 'entity-' + Math.random().toString(36).slice(2, 10);
    const numericId = hashStringToInt32(stringId);
    return { stringId, numericId };
  }
}
