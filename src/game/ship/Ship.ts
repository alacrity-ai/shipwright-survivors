// src/game/ship/Ship.ts

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { SerializedShip } from '@/systems/serialization/ShipSerializer';
import type { CoordKey } from '@/game/ship/utils/shipBlockUtils';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';
import type { WeaponFiringPlanEntry } from '@/systems/combat/types/WeaponTypes';
import type { TurretClassId, TurretSequenceState } from '@/systems/combat/types/WeaponTypes';
import type { HaloBladeProperties } from '@/game/interfaces/behavior/HaloBladeProperties';

import { FiringMode } from '@/systems/combat/types/WeaponTypes';

import { createPointLight } from '@/lighting/lights/createPointLight';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { BlockToObjectIndex } from '@/game/blocks/BlockToObjectIndexRegistry';
import { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import { Grid } from '@/systems/physics/Grid';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import { EnergyComponent } from '@/game/ship/components/EnergyComponent';
import { ShieldComponent } from '@/game/ship/components/ShieldComponent';
import { toKey, fromKey } from '@/game/ship/utils/shipBlockUtils';

type ShipDestroyedCallback = (ship: Ship) => void;

export class Ship extends CompositeBlockObject {
  private energyComponent: EnergyComponent | null = null;
  private shieldComponent: ShieldComponent;
  private shieldBlocks: Set<BlockInstance> = new Set();
  private firingPlan: WeaponFiringPlanEntry[] = [];
  private firingPlanIndex: Map<BlockInstance, number> = new Map();
  private turretSequenceState: Record<TurretClassId, TurretSequenceState> = {};
  private firingMode: FiringMode = FiringMode.Synced;
  private harvesterBlocks: Map<BlockInstance, number> = new Map();
  private haloBladeBlocks: Map<BlockInstance, HaloBladeProperties> = new Map();
  private isPlayerShip: boolean;
  private destroyedListeners: ShipDestroyedCallback[] = [];
  private lightAuraId: string | null = null;
  private thrusting: boolean = true;
  private strafingLeft: boolean = false;
  private strafingRight: boolean = false;
  private affixes: ShipAffixes = {};

  protected override generateId(): string {
    return 'ship-' + Math.random().toString(36).slice(2, 9);
  }

  constructor(
    grid: Grid,
    initialBlocks?: [GridCoord, BlockInstance][],
    initialTransform?: Partial<BlockEntityTransform>,
    isPlayerShip?: boolean,
    affixes?: ShipAffixes
  ) {
    super(grid, initialBlocks, initialTransform);
    this.shieldComponent = new ShieldComponent(this);
    this.validateFiringPlan();
    this.isPlayerShip = isPlayerShip ?? false;
    this.affixes = affixes ?? {};
  }

  public getIsPlayerShip(): boolean {
    return this.isPlayerShip;
  }

  public setIsPlayerShip(isPlayerShip: boolean): void {
    this.isPlayerShip = isPlayerShip;
  }

  // Affixes system
  public getAffixes(): ShipAffixes {
    return this.affixes;
  }

  public setAffixes(affixes: ShipAffixes): void {
    this.affixes = affixes;
  }

  public registerAuraLight(color: string = '#ffffff', radius: number = 64, intensity: number = 1.25): void {
    if (!LightingOrchestrator.hasInstance()) return;

    const orchestrator = LightingOrchestrator.getInstance();
    this.lightAuraId = `aura-${this.id}`;

    const auraLight = createPointLight({
      id: this.lightAuraId,
      x: this.getTransform().position.x,
      y: this.getTransform().position.y,
      radius: radius,
      color: color,
      intensity: intensity,
    });

    orchestrator.registerLight(auraLight);
  }

  public cleanupAuraLight(): void {
    if (!this.lightAuraId) return;
    LightingOrchestrator.getInstance().removeLight(this.lightAuraId);
    this.lightAuraId = null;
  }

  public getLightAuraId(): string | null {
    return this.lightAuraId;
  }

  // Ship movement / State

  public isThrusting(): boolean {
    return this.thrusting;
  }

  public isStrafingLeft(): boolean {
    return this.strafingLeft;
  }

  public isStrafingRight(): boolean {
    return this.strafingRight;
  }

  public setThrusting(thrusting: boolean): void {
    this.thrusting = thrusting;
  }

  public setStrafingLeft(strafingLeft: boolean): void {
    this.strafingLeft = strafingLeft;
  }

  public setStrafingRight(strafingRight: boolean): void {
    this.strafingRight = strafingRight;
  }

  // === Cockpit ===

  getCockpit(): BlockInstance | undefined {
    return this.blocks.get(toKey({ x: 0, y: 0 }));
  }

  public getCockpitHp(): number | null {
    const cockpit = this.getCockpit();
    if (!cockpit) {
      console.warn(`[Ship ${this.id}] Cockpit block missing.`);
      return null;
    }
    return cockpit.hp;
  }
  
  getCockpitCoord(): GridCoord | undefined {
    if (this.getCockpit()) {
      return { x: 0, y: 0 };
    }
    return undefined;
  }

  // === Firing Plan ===

  public getFiringPlan(): WeaponFiringPlanEntry[] {
    return this.firingPlan;
  }

  public getFiringMode(): FiringMode {
    return this.firingMode;
  }

  public setFiringMode(mode: FiringMode): void {
    this.firingMode = mode;
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

  public resetTurretSequenceState(): void {
    this.turretSequenceState = {};
  }

  // === Ship affixes ===

  // === Energy & Shield ===

  public getEnergyComponent(): EnergyComponent | null {
    return this.energyComponent;
  }

  public getShieldComponent(): ShieldComponent {
    return this.shieldComponent;
  }

  public getShieldBlocks(): Iterable<BlockInstance> {
    return this.shieldBlocks;
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

  public getHaloBladeBlocks(): Map<BlockInstance, HaloBladeProperties> {
    return this.haloBladeBlocks;
  }

  // === Utility Systems: Harvesting, etc ===

  public getTotalHarvestRate(): number {
    let total = 0;
    for (const rate of this.harvesterBlocks.values()) {
      total += rate;
    }
    return total;
  }

  private rebuildHaloBladeIndex(): void {
    this.haloBladeBlocks.clear();

    for (const [, block] of this.blocks.entries()) {
      const halo = block.type.behavior?.haloBladeProperties;
      if (halo) {
        this.haloBladeBlocks.set(block, halo);
      }
    }
  }

  // === Ship Specific Block Placement & Removal Overrides ===
  placeBlockById(coord: GridCoord, blockId: string, rotation?: number): boolean {
    const type = getBlockType(blockId);
    if (!type) throw new Error(`Unknown block type: ${blockId}`);

    const key = toKey(coord);
    if (this.blocks.has(key)) {
      return false; // Placement failed: cell already occupied
    }

    const worldPos = this.calculateBlockWorldPosition(coord);
    const uniqueId = crypto.randomUUID();

    const block: BlockInstance = {
      id: uniqueId,
      type,
      hp: type.armor,
      ownerShipId: this.id,
      position: worldPos,
      ...(rotation !== undefined ? { rotation } : {})
    };

    this.placeBlock(coord, block);
    return true;
  }

  placeBlock(coord: GridCoord, block: BlockInstance): void {
    const key = toKey(coord);
    this.blocks.set(key, block);
    this.grid.addBlockToCell(block); // Block is added to grid
    this.blockToCoordMap.set(block, coord);

    // Register block-to-object index
    BlockToObjectIndex.registerBlock(block, this);

    // Track if it's a shield block
    if (block.type.behavior?.shieldRadius) {
      this.shieldBlocks.add(block);
    }

    const harvestRate = block.type.behavior?.harvestRate;
    if (harvestRate) {
      this.harvesterBlocks.set(block, harvestRate);
    }

    const halo = block.type.behavior?.haloBladeProperties;
    if (halo) {
      this.haloBladeBlocks.set(block, halo);
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

      // Remove from subsystem indices
      this.harvesterBlocks.delete(block);
      this.shieldBlocks.delete(block);
      this.haloBladeBlocks.delete(block);
      this.removeWeaponFromPlanIfApplicable(block);

      // Unregister from block→object index
      BlockToObjectIndex.unregisterBlock(block);
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
      this.haloBladeBlocks.delete(block);
      BlockToObjectIndex.unregisterBlock(block);
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

  loadFromJson(data: SerializedShip): void {
    const transform = this.getTransform();
    transform.position = data.transform.position;
    transform.rotation = data.transform.rotation;

    data.blocks.forEach(blockData => {
      const { coord, id, rotation } = blockData;
      this.placeBlockById(coord, id, rotation);
    });

    this.validateFiringPlan();
    this.rebuildHaloBladeIndex();
  }

  // What about this?
  public destroyInstantly(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.deathTimestamp = performance.now() - 10000;

    for (const block of this.blocks.values()) {
      this.grid.removeBlockFromCell(block);
    }
    this.blocks.clear();
    this.blockToCoordMap.clear();

    // --- Aura Light Cleanup ---
    this.cleanupAuraLight();

    for (const callback of this.destroyedListeners) {
      callback(this);
    }
    this.destroyedListeners.length = 0;
  }


  // What about this?
  public onDestroyedCallback(callback: ShipDestroyedCallback): void {
    if (this.destroyed) {
      // If already destroyed, fire callback immediately
      callback(this);
      return;
    }
    this.destroyedListeners.push(callback);
  }

  public onDestroyed(): void {
    this.cleanupAuraLight();

    for (const cb of this.destroyedListeners) {
      cb(this);
    }
    this.destroyedListeners.length = 0;
  }
}
