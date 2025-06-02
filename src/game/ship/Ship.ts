// src/game/ship/Ship.ts

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import type { ShipTransform } from '@/systems/physics/MovementSystem';
import type { SerializedShip } from '@/systems/serialization/ShipSerializer';
import { Grid } from '@/systems/physics/Grid';
import { EnergyComponent } from '@/game/ship/components/EnergyComponent';
import { ShieldComponent } from '@/game/ship/components/ShieldComponent';
import { toKey, fromKey } from '@/game/ship/utils/shipBlockUtils';
import type { CoordKey } from '@/game/ship/utils/shipBlockUtils';

type ShipDestroyedCallback = (ship: Ship) => void;

interface WeaponFiringPlanEntry {
  coord: GridCoord;
  block: BlockInstance;
  fireRate: number;
  fireCooldown: number;
  timeSinceLastShot: number;
}

export class Ship {
  id: string;  // Unique identifier for the ship
  private blocks: Map<CoordKey, BlockInstance> = new Map();
  private blockToCoordMap: Map<BlockInstance, GridCoord> = new Map(); // Reverse lookup
  private transform: ShipTransform;
  private energyComponent: EnergyComponent | null = null;
  private shieldComponent: ShieldComponent;
  private shieldBlocks: Set<BlockInstance> = new Set();
  private firingPlan: WeaponFiringPlanEntry[] = [];
  private firingPlanIndex: Map<BlockInstance, number> = new Map();
  private harvesterBlocks: Map<BlockInstance, number> = new Map();
  private isPlayerShip: boolean = false;

  private destroyedListeners: ShipDestroyedCallback[] = [];
  
  // === Step 3: Two-phase destruction tracking ===
  private destroyed = false;
  private deathTimestamp: number | null = null;

  // === Memoized mass cache
  private totalMass: number | null = null;

  constructor(
    private grid: Grid,
    initialBlocks?: [GridCoord, BlockInstance][],
    initialTransform?: Partial<ShipTransform>
  ) {
    this.id = this.generateUniqueShipId();

    this.shieldComponent = new ShieldComponent(this);

    if (initialBlocks) {
      for (const [coord, block] of initialBlocks) {
        this.blocks.set(toKey(coord), block);
        this.grid.addBlockToCell(block);
      }

      this.shieldComponent.recalculateCoverage();
    }

    this.transform = {
      position: initialTransform?.position ?? { x: 640, y: 360 },
      velocity: initialTransform?.velocity ?? { x: 0, y: 0 },
      rotation: initialTransform?.rotation ?? 0,
      angularVelocity: initialTransform?.angularVelocity ?? 0
    };
  }

  public getFiringPlan(): WeaponFiringPlanEntry[] {
    return this.firingPlan;
  }

  /**
   * Adds a weapon to the firing plan if the block qualifies.
   */
  private addWeaponToPlanIfApplicable(coord: GridCoord, block: BlockInstance): void {
    const fire = block.type.behavior?.fire;
    if (!fire || !block.type?.behavior?.canFire) return;

    const entry: WeaponFiringPlanEntry = {
      coord,
      block,
      fireRate: fire.fireRate || 1,
      fireCooldown: 1 / (fire.fireRate || 1),
      timeSinceLastShot: 0,
    };

    const index = this.firingPlan.length;
    this.firingPlan.push(entry);
    this.firingPlanIndex.set(block, index);
  }

  /**
   * Prunes stale turret entries and rebuilds the turret plan index map.
   * Useful as a periodic consistency safeguard.
   */
  public validateFiringPlan(): void {
    const valid: WeaponFiringPlanEntry[] = [];
    const newIndex = new Map<BlockInstance, number>();

    for (const entry of this.firingPlan) {
      const isStillPresent =
        this.blocks.has(toKey(entry.coord)) &&
        this.blocks.get(toKey(entry.coord)) === entry.block;

      if (isStillPresent) {
        const newIndexValue = valid.length;
        valid.push(entry);
        newIndex.set(entry.block, newIndexValue);
      }
    }

    this.firingPlan = valid;
    this.firingPlanIndex = newIndex;
  }

  /**
   * Removes a turret from the firing plan using swap-and-pop for O(1) deletion.
   */
  private removeWeaponFromPlanIfApplicable(block: BlockInstance): void {
    const index = this.firingPlanIndex.get(block);
    if (index === undefined) return; // Not in plan

    const lastIndex = this.firingPlan.length - 1;
    const lastEntry = this.firingPlan[lastIndex];

    // Move last into deleted slot if needed
    if (index !== lastIndex) {
      this.firingPlan[index] = lastEntry;
      this.firingPlanIndex.set(lastEntry.block, index);
    }

    this.firingPlan.pop();
    this.firingPlanIndex.delete(block);
  }

  /**
   * Efficiently removes multiple weapon blocks from the firing plan in a single pass.
   * Maintains correctness of firingPlan array and firingPlanIndex map.
   */
  private removeWeaponsFromPlan(blocks: BlockInstance[]): void {
    if (blocks.length === 0) return;

    const toRemove = new Set<BlockInstance>(blocks);
    const newPlan: WeaponFiringPlanEntry[] = [];
    const newIndex = new Map<BlockInstance, number>();

    for (const entry of this.firingPlan) {
      if (!toRemove.has(entry.block)) {
        const newIdx = newPlan.length;
        newPlan.push(entry);
        newIndex.set(entry.block, newIdx);
      }
    }

    this.firingPlan = newPlan;
    this.firingPlanIndex = newIndex;
  }

  getTransform(): ShipTransform {
    return this.transform;
  }

  getIsPlayerShip(): boolean {
    return this.isPlayerShip;
  }

  setIsPlayerShip(isPlayerShip: boolean): void {
    this.isPlayerShip = isPlayerShip;
  }

  setTransform(newTransform: ShipTransform): void {
    this.transform = newTransform;
    this.updateBlockPositions();  // Update block positions when transform changes
  }

  placeBlockById(coord: GridCoord, blockId: string, rotation?: number): void {
    const type = getBlockType(blockId);
    if (!type) throw new Error(`Unknown block type: ${blockId}`);

    // Calculate the proper world position immediately
    const worldPos = this.calculateBlockWorldPosition(coord);  // Use the helper method to calculate world position
    
    const block: BlockInstance = {
      type,
      hp: type.armor,
      ownerShipId: this.id,  // Associate the block with this ship's ID
      position: worldPos,  // Set the calculated world position
      ...(rotation !== undefined ? { rotation } : {})  // Set the rotation if provided
    };

    this.placeBlock(coord, block);  // Place the block into the grid and the ship
  }

  placeBlock(coord: GridCoord, block: BlockInstance): void {
    const key = toKey(coord);
    this.blocks.set(key, block);
    this.grid.addBlockToCell(block);
    this.blockToCoordMap.set(block, coord);

    // Track if it's a shield block
    if (block.type.behavior?.shieldRadius) {
      this.shieldBlocks.add(block);
    }

    const harvestRate = block.type.behavior?.harvestRate;
    if (harvestRate) {
      this.harvesterBlocks.set(block, harvestRate);
    }

    this.invalidateMass();
    this.recomputeEnergyStats();
    this.addWeaponToPlanIfApplicable(coord, block);
    this.shieldComponent.recalculateCoverage();
  }

  removeBlock(coord: GridCoord): void {
    const key = toKey(coord);
    const block = this.blocks.get(key);
    if (block) {
      this.grid.removeBlockFromCell(block);
      this.blockToCoordMap.delete(block);

      // Remove from harvester index
      this.harvesterBlocks.delete(block);
      // Remove from shield index
      this.shieldBlocks.delete(block);
      // Remove from turret index
      this.removeWeaponFromPlanIfApplicable(block);
    }

    this.blocks.delete(key);
    this.invalidateMass();
    this.recomputeEnergyStats();
    this.shieldComponent.recalculateCoverage();
  }

  public removeBlocks(coords: GridCoord[], preResolvedBlocks?: BlockInstance[]): void {
    if (coords.length === 0) return;

    // Step 1: Collect all blocks to remove and remove from spatial maps
    const blocksToRemove: BlockInstance[] = preResolvedBlocks ?? [];

    if (!preResolvedBlocks) {
      for (const coord of coords) {
        const key = toKey(coord);
        const block = this.blocks.get(key);
        if (!block) continue;

        blocksToRemove.push(block);
        this.blocks.delete(key);
        this.blockToCoordMap.delete(block);
      }
    } else {
      for (const block of preResolvedBlocks) {
        const coord = this.blockToCoordMap.get(block);
        if (coord) {
          const key = toKey(coord);
          this.blocks.delete(key);
        }
        this.blockToCoordMap.delete(block);
      }
    }

    if (blocksToRemove.length === 0) {
      return;
    }

    // Step 2: Remove from grid in batch
    this.grid.removeBlocksFromCells(blocksToRemove);

    // Step 3: Bulk-remove from subsystems
    for (const block of blocksToRemove) {
      this.harvesterBlocks.delete(block);
      this.shieldBlocks.delete(block);
    }

    this.removeWeaponsFromPlan(blocksToRemove);

    // Step 4: Recompute affected state only once
    this.invalidateMass();
    this.recomputeEnergyStats();
    this.shieldComponent.recalculateCoverage();
  }

  /** Returns true if removing the given block would not disconnect other blocks */
  public isDeletionSafe(coord: GridCoord): boolean {
    const removeKey = toKey(coord);
    if (!this.blocks.has(removeKey)) return true;

    // Clone the current block map (shallow copy)
    const remaining = new Map(this.blocks);
    remaining.delete(removeKey);

    // Find cockpit or fallback to first block
    const rootKey = [...remaining.entries()]
      .find(([, b]) => b.type.id.startsWith('cockpit'))?.[0]
      ?? [...remaining.keys()][0];

    if (!rootKey) return true; // Nothing left, safe to remove

    // Flood-fill to count reachable blocks
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
        { x, y: y - 1 }
      ];

      for (const n of neighbors) {
        const nk = toKey(n);
        if (remaining.has(nk) && !visited.has(nk)) {
          queue.push(nk);
        }
      }
    }

    // Safe if all remaining blocks are still connected
    return visited.size === remaining.size;
  }

  getBlock(coord: GridCoord): BlockInstance | undefined {
    return this.blocks.get(toKey(coord));
  }

  public getAllBlocks(): [GridCoord, BlockInstance][] {
    if (!this.blocks) {
      return []; // Return empty array instead of undefined
    }
    
    return Array.from(this.blocks.entries()).map(([key, block]) => {
      return [fromKey(key), block];
    });
  }

  public getBlockMap(): Map<string, BlockInstance> {
    return this.blocks;
  }

  public getShieldBlocks(): Iterable<BlockInstance> {
    return this.shieldBlocks;
  }

  hasBlockAt(coord: GridCoord): boolean {
    return this.blocks.has(toKey(coord));
  }

  getCockpit(): BlockInstance | undefined {
    return this.blocks.get(toKey({ x: 0, y: 0 }));
  }

  getCockpitCoord(): GridCoord | undefined {
    if (this.getCockpit()) {
      return { x: 0, y: 0 };
    }
    return undefined;
  }

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

  getTotalMass(): number {
    if (this.totalMass == null) {
      this.totalMass = 0;
      for (const block of this.blocks.values()) {
        this.totalMass += block.type.mass;
      }
    }
    return this.totalMass;
  }

  public getTotalHarvestRate(): number {
    let total = 0;
    for (const rate of this.harvesterBlocks.values()) {
      total += rate;
    }
    return total;
  }

  private invalidateMass(): void {
    this.totalMass = null;
  }

  private generateUniqueShipId(): string {
    return 'ship-' + Math.random().toString(36).substr(2, 9);
  }

  // Get block's world position based on ship's transform
  getBlockWorldPosition(block: BlockInstance): { x: number; y: number } {
    if (!block.position) return { x: 0, y: 0 };

    const transform = this.getTransform();
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);

    const worldX = transform.position.x + block.position.x * 32 * cos - block.position.y * 32 * sin;
    const worldY = transform.position.y + block.position.x * 32 * sin + block.position.y * 32 * cos;

    return { x: worldX, y: worldY };
  }

  // Update all blocks' positions based on ship's transform (world position and rotation)
  public updateBlockPositions(): void {
    for (const [coordKey, block] of this.blocks.entries()) {
      const coord = fromKey(coordKey);  // Get the block's grid position

      // Remove from old grid position before updating
      this.grid.removeBlockFromCell(block);

      // Calculate the new world position of the block
      const worldPos = this.calculateBlockWorldPosition(coord);
      block.position = worldPos;

      // Add to new grid position based on updated world position
      this.grid.addBlockToCell(block);
    }
  }

  // Calculate block's world position based on ship's transform
  private calculateBlockWorldPosition(coord: GridCoord): { x: number; y: number } {
    const transform = this.getTransform();
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);

    // Calculate the world position of the block based on its grid position and ship's transform
    const worldX = transform.position.x + coord.x * 32 * cos - coord.y * 32 * sin;
    const worldY = transform.position.y + coord.x * 32 * sin + coord.y * 32 * cos;

    return { x: worldX, y: worldY };
  }

  loadFromJson(data: SerializedShip): void {
    const transform = this.getTransform();
    transform.position = data.transform.position;
    transform.rotation = data.transform.rotation;

    data.blocks.forEach(blockData => {
      const { coord, id, rotation } = blockData;
      this.placeBlockById(coord, id, rotation);
    });

    this.validateFiringPlan();
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

  getGrid(): Grid {
    return this.grid;
  }

  public destroy(): void {
    if (this.destroyed) return;
    
    this.destroyed = true;
    this.deathTimestamp = performance.now();

    // Remove all blocks from collision grid
    for (const block of this.blocks.values()) {
      this.grid.removeBlockFromCell(block);
    }

    // Clear internal block references
    this.blocks.clear();
    this.blockToCoordMap.clear();

    // Notify all listeners that this ship was logically destroyed
    // This triggers wave progression, AI cleanup, registry removal, etc.
    for (const callback of this.destroyedListeners) {
      callback(this);
    }

    // Clear listeners to break reference chains
    this.destroyedListeners.length = 0;
  }

  public destroyInstantly(): void {
    if (this.destroyed) return;
    
    this.destroyed = true;
    this.deathTimestamp = performance.now() - 10000; // Mark as expired long ago

    // Same cleanup as destroy()
    for (const block of this.blocks.values()) {
      this.grid.removeBlockFromCell(block);
    }
    this.blocks.clear();
    this.blockToCoordMap.clear();

    for (const callback of this.destroyedListeners) {
      callback(this);
    }
    this.destroyedListeners.length = 0;
  }

  /**
   * Returns true if the ship has been logically destroyed.
   */
  public isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Returns true if enough time has passed since destruction that visual effects
   * 
   * @param visualEffectDurationMs How long visual effects should persist (default: 2000ms)
   */
  public isVisuallyExpired(visualEffectDurationMs: number = 2000): boolean {
    if (!this.destroyed || this.deathTimestamp === null) {
      return false;
    }
    return (performance.now() - this.deathTimestamp) > visualEffectDurationMs;
  }

  /**
   * Returns the timestamp when the ship was destroyed, or null if still alive.
   * Useful for calculating time-based visual effects or debugging.
   */
  public getDeathTimestamp(): number | null {
    return this.deathTimestamp;
  }

  /**
   * Returns milliseconds since destruction, or 0 if still alive.
   * Useful for fade-out calculations or time-based visual effects.
   */
  public getTimeSinceDeath(): number {
    if (!this.destroyed || this.deathTimestamp === null) {
      return 0;
    }
    return performance.now() - this.deathTimestamp;
  }

  public onDestroyed(callback: ShipDestroyedCallback): void {
    if (this.destroyed) {
      // If already destroyed, fire callback immediately
      callback(this);
      return;
    }
    this.destroyedListeners.push(callback);
  }

  public getEnergyComponent(): EnergyComponent | null {
    return this.energyComponent;
  }

  public getShieldComponent(): ShieldComponent {
    return this.shieldComponent;
  }

  public updateEnergy(dt: number): void {
    this.energyComponent?.update(dt);
  }

  private recomputeEnergyStats(): void {
    if (!this.energyComponent) {
      this.enableEnergyComponent();
    }

    const energyComponent = this.getEnergyComponent();
    if (!energyComponent) return;

    const { max, regen } = this.computeEnergyStats();
    energyComponent.setMax(max);
    energyComponent.setRechargeRate(regen);
  }

  public enableEnergyComponent(): void {
    if (this.energyComponent) return;

    const { max, regen } = this.computeEnergyStats();
    if (max === 0) return;

    this.energyComponent = new EnergyComponent(max, regen);
  }

  private computeEnergyStats(): { max: number; regen: number } {
    let totalMax = 0;
    let totalRegen = 0;

    for (const [, block] of this.blocks.entries()) {
      const behavior = block.type.behavior;

      // Any energy-contributing block declares it explicitly
      if (behavior?.energyMaxIncrease) {
        totalMax += behavior.energyMaxIncrease;
      }

      if (behavior?.energyChargeRate) {
        totalRegen += behavior.energyChargeRate;
      }
    }

    return {
      max: totalMax,
      regen: totalRegen > 0 ? totalRegen : 10,
    };
  }
}

