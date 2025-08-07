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

import { CollisionBoxManager } from './collisionbox/CollisionBoxManager';
import { CollisionBoxOrchestrator } from './collisionbox/CollisionBoxOrchestrator';

import { Faction } from '@/game/interfaces/types/Faction';
import { AnchorPointComponent } from '@/game/ship/anchors/AnchorPointComponent';


export abstract class CompositeBlockObject {
  readonly id: string;
  readonly numericId: number;

  protected currentHealth: number = 0;
  protected maxHealth: number = 0;
  protected maxHealthDamageIntakePerSecond: number = 1000; // New
  protected lastHealthDamageTimestamp: number = 0; // New!

  protected blockManager: BlockManager;
  protected blockOrchestrator: BlockOrchestrator;
  protected collisionBoxManager: CollisionBoxManager;
  protected collisionBoxOrchestrator: CollisionBoxOrchestrator;

  protected transform: BlockEntityTransform;
  protected destroying: boolean = false;
  protected destroyed: boolean = false;
  protected deathTimestamp: number | null = null;

  protected totalMass: number | null = null;
  protected immoveable: boolean = false;

  protected faction: Faction;

  protected collidingUntil: number = 0;

  protected blockColor: string | null = null;
  protected blockColorIntensity: number = 0.5;

  protected noClip: boolean = false;

  protected bossPhase: number = 1;

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
    this.collisionBoxManager = CollisionBoxManager.getInstance();
    this.blockOrchestrator = this.blockManager.getBlockOrchestrator();
    this.collisionBoxOrchestrator = this.collisionBoxManager.getCollisionBoxOrchestrator();

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
            group: 0,
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

  public setDestroying(value: boolean): void {
    this.destroying = value;
  }

  public isDestroying(): boolean {
    return this.destroying;
  }

  // --- Block Access & Placement ---

  /**
   * Places a block at the given grid coordinate and returns its SOA index.
   * @param coord Local grid coordinate (relative to the ship)
   * @param typeId Block type identifier
   * @param rotation Optional local rotation (radians)
   * @returns The SOA index of the created block, or -1 if allocation failed
   */
  public placeBlock(coord: GridCoord, typeId: string, rotation: number = 0, group: number = 0): number {
    const typeIndex = BlockTypeIndex[typeId] ?? 0;
    const factionIndex = FACTION_TO_INDEX[this.faction];

    const idx = this.blockOrchestrator.createAndRegisterBlock(
      {
        ownerShipId: this.numericId,
        ownerFaction: factionIndex,
        typeIndex,
        group,
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

  public hasBlockAtXY(x: number, y: number): boolean {
    const indices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    const store = this.blockManager.getBlockStore();

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (store.localX[idx] === x && store.localY[idx] === y) {
        return true;
      }
    }
    return false;
  }

  // == Health management (for bosses and other nonblock damage entities)
  
  // Returns current health
  public getCurrentHealth(): number {
    return this.currentHealth;
  }

  // Returns max health
  public getMaxHealth(): number {
    return this.maxHealth;
  }

  // Sets health, can be used for taking damage, healing, etc
  public setCurrentHealth(health: number): void {
    this.currentHealth = health;
  }

  /**
   * Applies damage to the object's health pool, respecting the per-second intake cap.
   * Returns the actual amount of damage applied after throttling.
   */
  public applyDamageToHealth(requestedDamage: number): number {
    if (requestedDamage <= 0 || this.currentHealth <= 0) return 0;

    const now = performance.now();
    const deltaMs = now - this.lastHealthDamageTimestamp;

    // Convert max DPS into per-millisecond cap
    const maxDps = this.maxHealthDamageIntakePerSecond;
    const allowedDamage = (deltaMs / 1000) * maxDps;

    // Determine effective damage to apply, bounded by health and throttle
    const actualDamage = Math.min(requestedDamage, allowedDamage, this.currentHealth);

    if (actualDamage <= 0) return 0;

    this.currentHealth -= actualDamage;
    this.lastHealthDamageTimestamp = now;

    return actualDamage;
  }

  // Sets max health damage intake per second
  public setMaxHealthDamageIntakePerSecond(damage: number): void {
    this.maxHealthDamageIntakePerSecond = damage;
  }

  public getMaxHealthDamageIntakePerSecond(): number {
    return this.maxHealthDamageIntakePerSecond;
  }

  // Initializes health on an entity/boss/etc
  public initializeHealth(maxHealth: number): void {
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
  }

  // Can be used to determine if the entity is using the health system at all
  public hasHealth(): boolean {
    return this.maxHealth > 0;
  }

  // --- Boss Phase (Only applies to bosses or phased enemies)

  public getBossPhase(): number {
    return this.bossPhase;
  }

  public setBossPhase(phase: number): void {
    this.bossPhase = phase;
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
    const targetShipId = this.numericId;

    for (const coord of coords) {
      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];

        // Verify ownership before any action
        const ownerShipId = store.ownerShipId[idx];
        if (ownerShipId !== targetShipId) {
          console.error(
            `[CompositeBlockObject] ⚠ Attempting to remove block ${idx} at (${coord.x},${coord.y}) ` +
            `but it belongs to ship ${ownerShipId}, not ${targetShipId}`
          );
        }

        if (store.localX[idx] === coord.x && store.localY[idx] === coord.y) {
          this.blockOrchestrator.destroyBlock(idx);
          break; // move to next coordinate
        }
      }
    }

    // Recalculate mass next time it's queried
    this.invalidateMass();
  }

  /**
   * Removes multiple blocks by their SOA indices.
   * Assumes all indices belong to this entity.
   * Does not perform coordinate comparison or ownership validation.
   */
  public removeBlocksByIndexFast(indices: number[]): void {
    for (let i = 0; i < indices.length; i++) {
      this.blockOrchestrator.destroyBlock(indices[i]);
    }
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

  public getPositionFast(out: { x: number; y: number }): void {
    out.x = this.transform.position.x;
    out.y = this.transform.position.y;
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
   * Also updates any attached anchor point component and collision box.
   */
  public updateBlockPositions(): void {
    // Update SOA positions and handle spatial rehoming via BlockOrchestrator
    this.blockOrchestrator.updateShipBlocks(this.numericId, this.transform);

    // Update anchor points (used for AI targeting, etc.)
    if (this.anchorPointComponent) {
      this.anchorPointComponent.updateFromTransform(this.transform);
    }

    // ─── Sync Collision Box Transform ──────────────────────────────────────
    const boxIndex = this.collisionBoxOrchestrator.getBoxIndexByShipId(this.numericId);
    if (boxIndex !== undefined) {
      this.collisionBoxOrchestrator.updateAndSync(
        boxIndex,
        this.transform.position,
        this.transform.rotation ?? 0
      );
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
  public destroy(clearBlocks: boolean = true): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.deathTimestamp = performance.now();

    // Clear all blocks for this ship (handles BlockStore + BlockSpatialGrid teardown)
    if (clearBlocks) {
      this.blockOrchestrator.clearShip(this.numericId);
    }

    // ─── Clear Collision Box ───────────────────────────────────────────────
    const boxIndex = this.collisionBoxOrchestrator.getBoxIndexByShipId(this.numericId);
    if (boxIndex !== undefined) {
      this.collisionBoxOrchestrator.destroyCollisionBox(boxIndex);
    }

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

    this.registerCollisionBox();
  }

  protected registerCollisionBox(): void {
    const indices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    if (indices.length === 0) return;

    const store = this.blockManager.getBlockStore();

    // Compute min/max local-space extents (block coords × BLOCK_SIZE)
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    const BLOCK_SIZE = 32;

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const x = store.localX[idx] * BLOCK_SIZE;
      const y = store.localY[idx] * BLOCK_SIZE;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + BLOCK_SIZE > maxX) maxX = x + BLOCK_SIZE;
      if (y + BLOCK_SIZE > maxY) maxY = y + BLOCK_SIZE;
    }

    // Allocate and register the collision box.
    // The store will compute pivotOffset and re-center local extents.
    const boxIndex = this.collisionBoxOrchestrator.createCollisionBox({
      shipNumericId: this.numericId,
      localX1: minX,
      localY1: minY,
      localX2: maxX,
      localY2: maxY,
    });

    if (boxIndex !== -1) {
      // Let the orchestrator compute the true world center (shipPos + rotated pivot)
      this.collisionBoxOrchestrator.updateWorldTransform(
        boxIndex,
        this.transform.position,
        this.transform.rotation ?? 0
      );
      this.collisionBoxOrchestrator.rehomeBox(boxIndex);
    }
  }

  protected generateId(): { stringId: string; numericId: number } {
    const stringId = 'entity-' + Math.random().toString(36).slice(2, 10);
    const numericId = hashStringToInt32(stringId);
    return { stringId, numericId };
  }
}
