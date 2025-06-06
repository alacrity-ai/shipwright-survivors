// src/game/entities/CompositeBlockObject.ts

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { SerializedBlockObject } from '@/systems/serialization/CompositeBlockObjectSerializer';

import { Grid } from '@/systems/physics/Grid';
import { BlockToObjectIndex } from '@/game/blocks/BlockToObjectIndexRegistry';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import { toKey, fromKey, type CoordKey } from '@/game/ship/utils/shipBlockUtils';

export abstract class CompositeBlockObject {
  readonly id: string;
  protected grid: Grid;

  protected blocks: Map<CoordKey, BlockInstance> = new Map();
  protected blockToCoordMap: Map<BlockInstance, GridCoord> = new Map();

  protected transform: BlockEntityTransform;
  protected destroyed: boolean = false;
  protected deathTimestamp: number | null = null;

  protected totalMass: number | null = null;
  protected immoveable: boolean = false;

  constructor(
    grid: Grid,
    initialBlocks?: [GridCoord, BlockInstance][],
    initialTransform?: Partial<BlockEntityTransform>
  ) {
    this.grid = grid;
    this.id = this.generateId();

    this.transform = {
      position: initialTransform?.position ?? { x: 0, y: 0 },
      velocity: initialTransform?.velocity ?? { x: 0, y: 0 },
      rotation: initialTransform?.rotation ?? 0,
      angularVelocity: initialTransform?.angularVelocity ?? 0,
    };

    if (initialBlocks) {
      for (const [coord, block] of initialBlocks) {
        this.blocks.set(toKey(coord), block);
        this.grid.addBlockToCell(block);
        this.blockToCoordMap.set(block, coord);
        BlockToObjectIndex.registerBlock(block, this);
      }
    }
  }

  /** Subclass must define entity update logic */
  public update(dt: number): void {};

  /** Optional: behavior when destroyed */
  public onDestroyed(): void {};

  // --- Block Access & Placement ---

  public placeBlock(coord: GridCoord, block: BlockInstance): void {
    const key = toKey(coord);
    this.blocks.set(key, block);
    this.grid.addBlockToCell(block);
    this.blockToCoordMap.set(block, coord);
    BlockToObjectIndex.registerBlock(block, this);

    this.invalidateMass();
  }

  public getBlock(coord: GridCoord): BlockInstance | undefined {
    return this.blocks.get(toKey(coord));
  }

  public hasBlockAt(coord: GridCoord): boolean {
    return this.blocks.has(toKey(coord));
  }

  public getBlockMap(): Map<string, BlockInstance> {
    return this.blocks;
  }

  public getAllBlocks(): [GridCoord, BlockInstance][] {
    return Array.from(this.blocks.entries()).map(([key, block]) => [fromKey(key), block]);
  }

  public getBlockCount(): number {
    return this.blocks.size;
  }

  public getCenterBlock(): BlockInstance | undefined {
    return this.blocks.get('0,0');
  }

  // Do we need both this and findBlockCoord?
  public getBlockCoord(block: BlockInstance): GridCoord | null {
    return this.blockToCoordMap.get(block) ?? null;
  }

  getBlocksWithinGridDistance(centerCoord: GridCoord, distance: number): BlockInstance[] {
    const blocksInRange: BlockInstance[] = [];
    
    for (const [_, block] of this.getAllBlocks()) {
      const blockCoord = this.getBlockCoord(block);
      if (!blockCoord) continue;
      
      const dx = Math.abs(blockCoord.x - centerCoord.x);
      const dy = Math.abs(blockCoord.y - centerCoord.y);
      
      const gridDistance = Math.max(dx, dy); // Chebyshev (square coverage)
      
      if (gridDistance <= distance) {
        blocksInRange.push(block);
      }
    }
    
    return blocksInRange;
  }

  public hideAllBlocks(): void {
    for (const block of this.blocks.values()) {
      block.hidden = true;
    }
  }

  public showAllBlocks(): void {
    for (const block of this.blocks.values()) {
      block.hidden = false;
    }
  }

  /**
   * Given a block instance, return its corresponding grid coordinate within the ship.
   * Returns null if the block is not found or no longer exists.
   */
  public findBlockCoord(block: BlockInstance): GridCoord | null {
    for (const [key, stored] of this.blocks.entries()) {
      if (stored === block) {
        return fromKey(key);
      }
    }
    return null;
  }

  public removeBlock(coord: GridCoord): void {
    const key = toKey(coord);
    const block = this.blocks.get(key);
    if (!block) return;

    BlockToObjectIndex.unregisterBlock(block);
    this.grid.removeBlockFromCell(block);
    this.blocks.delete(key);
    this.blockToCoordMap.delete(block);
    this.invalidateMass();
  }

  public removeBlocks(coords: GridCoord[], preResolved?: BlockInstance[]): void {
    const toRemove: BlockInstance[] = preResolved ?? [];

    if (!preResolved) {
      for (const coord of coords) {
        const key = toKey(coord);
        const block = this.blocks.get(key);
        if (!block) continue;

        toRemove.push(block);
        this.blocks.delete(key);
        this.blockToCoordMap.delete(block);
      }
    } else {
      for (const block of preResolved) {
        const coord = this.blockToCoordMap.get(block);
        if (coord) this.blocks.delete(toKey(coord));
        this.blockToCoordMap.delete(block);
      }
    }

    for (const block of toRemove) {
      BlockToObjectIndex.unregisterBlock(block);
    }

    this.grid.removeBlocksFromCells(toRemove);
    this.invalidateMass();
  }

  // --- Spatial Access ---

  public getTransform(): BlockEntityTransform {
    return this.transform;
  }

  public setTransform(newTransform: BlockEntityTransform): void {
    this.transform = { ...newTransform };
    this.updateBlockPositions();
  }

  public getGrid(): Grid {
    return this.grid;
  }

  public setImmoveable(value: boolean): void {
    this.immoveable = value;
  }

  public isImmoveable(): boolean {
    return this.immoveable;
  }

  // FROM COMPOSITE BLOCK OBJECT

  public getBlockWorldPosition(block: BlockInstance): { x: number; y: number } {
    const coord = this.getBlockCoord(block);
    if (!coord) return { x: 0, y: 0 };
    return this.calculateBlockWorldPosition(coord);
  }

  protected calculateBlockWorldPosition(coord: GridCoord): { x: number; y: number } {
    const { position, rotation } = this.transform;
    const { x: px, y: py } = position;

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const worldX = px + coord.x * 32 * cos - coord.y * 32 * sin;
    const worldY = py + coord.x * 32 * sin + coord.y * 32 * cos;

    return { x: worldX, y: worldY };
  }

  public updateBlockPositions(): void {
    for (const [coordKey, block] of this.blocks.entries()) {
      const coord = fromKey(coordKey);
      this.grid.removeBlockFromCell(block);
      block.position = this.calculateBlockWorldPosition(coord);
      this.grid.addBlockToCell(block);
    }
  }

  // --- Mass ---

  public getTotalMass(): number {
    if (this.totalMass == null) {
      let total = 0;
      for (const block of this.blocks.values()) {
        total += block.type.mass;
      }
      this.totalMass = total;
    }
    return this.totalMass;
  }

  protected invalidateMass(): void {
    this.totalMass = null;
  }

  // --- Destruction Lifecycle ---

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.deathTimestamp = performance.now();

    for (const block of this.blocks.values()) {
      this.grid.removeBlockFromCell(block);
    }

    this.blocks.clear();
    this.blockToCoordMap.clear();

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

  public isDeletionSafe(coord: GridCoord): boolean {
    const removeKey = toKey(coord);
    if (!this.blocks.has(removeKey)) return true;

    const remaining = new Map(this.blocks);
    remaining.delete(removeKey);

    const rootKey = [...remaining.keys()][0];
    if (!rootKey) return true;

    const visited = new Set<CoordKey>();
    const queue: CoordKey[] = [rootKey];

    while (queue.length > 0) {
      const key = queue.pop()!;
      if (visited.has(key)) continue;
      visited.add(key);

      const { x, y } = fromKey(key);
      const neighbors: GridCoord[] = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      ];

      for (const n of neighbors) {
        const nk = toKey(n);
        if (remaining.has(nk) && !visited.has(nk)) {
          queue.push(nk);
        }
      }
    }

    return visited.size === remaining.size;
  }

  // --- Misc ---

  public loadFromJson(data: SerializedBlockObject): void {
    const { position, velocity, rotation, angularVelocity } = data.transform;

    this.transform.position = position;
    this.transform.velocity = velocity;
    this.transform.rotation = rotation;
    this.transform.angularVelocity = angularVelocity;

    data.blocks.forEach(blockData => {
      const type = getBlockType(blockData.id);
      if (!type) {
        console.warn(`Unknown block type during deserialization: ${blockData.id}`);
        return;
      }

      const block: BlockInstance = {
        type,
        rotation: blockData.rotation ?? 0,
        hp: type.armor,
        ownerShipId: this.id,
        position: { x: 0, y: 0 },
      };

      const coordKey = toKey(blockData.coord);
      this.blocks.set(coordKey, block);
      this.blockToCoordMap.set(block, blockData.coord);
      this.grid.addBlockToCell(block);
    });

    this.invalidateMass();
    this.updateBlockPositions();
  }

  protected generateId(): string {
    return 'entity-' + Math.random().toString(36).slice(2, 10);
  }
}
