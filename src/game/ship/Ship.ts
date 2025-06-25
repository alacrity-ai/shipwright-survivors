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

import { ShipGrid } from '@/game/ship/ShipGrid';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { FiringMode } from '@/systems/combat/types/WeaponTypes';
import { PlayerStats } from '@/game/player/PlayerStats';
import { createPointLight } from '@/lighting/lights/createPointLight';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { BlockToObjectIndex } from '@/game/blocks/BlockToObjectIndexRegistry';
import { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import { Grid } from '@/systems/physics/Grid';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import { EnergyComponent } from '@/game/ship/components/EnergyComponent';
import { ShieldComponent } from '@/game/ship/components/ShieldComponent';
import { AfterburnerComponent } from './components/AfterburnerComponent';
import { toKey, fromKey } from '@/game/ship/utils/shipBlockUtils';
import { Faction } from '@/game/interfaces/types/Faction';

import { ShipRasterizationService } from '@/rendering/services/ShipRasterizationService';
import { GlobalSpriteRequestBus } from '@/rendering/unified/bus/SpriteRenderRequestBus';
import type { SpriteRenderRequest } from '@/rendering/unified/interfaces/SpriteRenderRequest';
import { CanvasManager } from '@/core/CanvasManager';
import { emitPlayerDefeat } from '@/core/interfaces/events/PlayerOutcomeReporter';

type ShipDestroyedCallback = (ship: Ship) => void;

export class Ship extends CompositeBlockObject {
  private afterburnerComponent: AfterburnerComponent | null = null;
  private energyComponent: EnergyComponent | null = null;
  private shieldComponent: ShieldComponent;
  private shieldBlocks: Set<BlockInstance> = new Set();
  private engineBlocks: Set<BlockInstance> = new Set();
  private finBlocks: Set<BlockInstance> = new Set();
  private fuelTankBlocks: Set<BlockInstance> = new Set();
  private firingPlan: WeaponFiringPlanEntry[] = [];
  private firingPlanIndex: Map<BlockInstance, number> = new Map();
  private turretSequenceState: Record<TurretClassId, TurretSequenceState> = {};
  private firingMode: FiringMode = FiringMode.Synced;
  private harvesterBlocks: Map<BlockInstance, number> = new Map();
  private haloBladeBlocks: Map<BlockInstance, HaloBladeProperties> = new Map();
  private heatSeekerBlocks: Map<BlockInstance, number> = new Map();
  private isPlayerShip: boolean;
  private destroyedListeners: ShipDestroyedCallback[] = [];
  private lightAuraId: string | null = null;
  private thrusting: boolean = true;
  private strafingLeft: boolean = false;
  private strafingRight: boolean = false;
  private affixes: ShipAffixes = {};

  // === Rasterization Cache ===
  private rasterizedTexture: WebGLTexture | null = null;
  private rasterizedTextureOffset: { x: number; y: number } = { x: 0, y: 0 };
  private rasterizedTextureSize: { width: number; height: number } = { width: 0, height: 0 };
  private rasterDirty: boolean = true; // true means "must rerasterize"

  protected override generateId(): string {
    return 'ship-' + Math.random().toString(36).slice(2, 9);
  }

  constructor(
    grid: Grid,
    initialBlocks?: [GridCoord, BlockInstance][],
    initialTransform?: Partial<BlockEntityTransform>,
    isPlayerShip?: boolean,
    affixes?: ShipAffixes,
    faction?: Faction
  ) {
    super(grid, initialBlocks, initialTransform);
    this.shieldComponent = new ShieldComponent(this);
    this.afterburnerComponent = new AfterburnerComponent(100, 5);
    this.validateFiringPlan();
    this.isPlayerShip = isPlayerShip ?? false;
    this.affixes = affixes ?? {};
    this.faction = faction ?? Faction.Enemy;
  }

  public getIsPlayerShip(): boolean {
    return this.isPlayerShip;
  }

  public setIsPlayerShip(isPlayerShip: boolean): void {
    this.isPlayerShip = isPlayerShip;
  }

  // == Affixes system
  public getAffixes(): ShipAffixes {
    return this.affixes;
  }

  public setAffixes(affixes: ShipAffixes): void {
    this.affixes = affixes;
  }

  // == Afterburner
  public getAfterburnerComponent(): AfterburnerComponent | null {
    return this.afterburnerComponent;
  }

  public triggerAfterburner(): void {
    if (!this.afterburnerComponent) return;
    this.afterburnerComponent.setActive(true);
  }

  public deactivateAfterburner(): void {
    if (!this.afterburnerComponent) return;
    this.afterburnerComponent.setActive(false);
  }

  public isAfterburnerActive(): boolean {
    return this.afterburnerComponent?.isActive() ?? false;
  }

  public getAfterburnerSpeedMultiplier(): number {
    return this.afterburnerComponent?.getSpeedMultiplier() ?? 1;
  }

  public getAfterburnerAccelMultiplier(): number {
    return this.afterburnerComponent?.getAccelerationMultiplier() ?? 1;
  }

  // Light
  public registerAuraLight(color: string = '#ffffff', radius: number = 64, intensity: number = 1.25): void {
    if (!LightingOrchestrator.hasInstance()) return;

    if (this.lightAuraId) return;
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

  public updateAuraLight(color: string = '#ffffff', radius: number = 64, intensity: number = 1.25): void {
    if (!LightingOrchestrator.hasInstance()) return;

    this.cleanupAuraLight();

    const orchestrator = LightingOrchestrator.getInstance();
    this.lightAuraId = `aura-${this.id}`;

    const updatedLight = createPointLight({
      id: this.lightAuraId,
      x: this.getTransform().position.x,
      y: this.getTransform().position.y,
      radius,
      color,
      intensity,
    });

    orchestrator.registerLight(updatedLight);
  }

  public cleanupAuraLight(): void {
    if (!this.lightAuraId) return;
    LightingOrchestrator.getInstance().removeLight(this.lightAuraId);
    this.lightAuraId = null;
  }

  public getLightAuraId(): string | null {
    return this.lightAuraId;
  }

  // Rasterization

  public markRasterDirty(): void {
    this.rasterDirty = true;
  }

  public getRasterizedTexture(): WebGLTexture | null {
    return this.rasterizedTexture;
  }

  public getRasterizedTextureOffset(): { x: number; y: number } {
    return this.rasterizedTextureOffset;
  }

  public getRasterizedTextureSize(): { width: number; height: number } {
    return this.rasterizedTextureSize;
  }

  public rerasterizeIfDirty(gl: WebGL2RenderingContext): void {
    if (!this.rasterDirty) return;
    this.rerasterize(gl);
    this.rasterDirty = false;
  }

  public rerasterize(gl: WebGL2RenderingContext): void {
    if (this.rasterizedTexture && gl.isTexture(this.rasterizedTexture)) {
      gl.deleteTexture(this.rasterizedTexture);
    }

    const rasterizer = new ShipRasterizationService(gl);
    const result = rasterizer.rasterize(this);

    if (!result) {
      this.rasterizedTexture = null;
      this.rasterizedTextureSize = { width: 0, height: 0 };
      return;
    }

    this.rasterizedTexture = result.texture;
    this.rasterizedTextureSize = result.size;
  }

  public enqueueRenderRequest(): void {
    if (!this.rasterizedTexture) return;

    const transform = this.getTransform();
    const pos = transform.position;
    const rot = transform.rotation;
    const size = this.rasterizedTextureSize;

    const request: SpriteRenderRequest = {
      texture: this.rasterizedTexture,
      worldX: pos.x,
      worldY: pos.y,
      widthPx: size.width,
      heightPx: size.height,
      alpha: 1.0,
      rotation: rot,
    };

    GlobalSpriteRequestBus.add(request);
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
    return this.blocks.get(toKey({ x: 0, y: 0 }))?.block;
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
    if (this.isPlayerShip) {
      PlayerStats.getInstance().setFiringMode(mode);
    }
  }

  /**
   * Prunes stale turret entries and rebuilds the turret plan index map.
   * Useful as a periodic consistency safeguard.
   */
  public validateFiringPlan(): void {
    const valid: WeaponFiringPlanEntry[] = [];
    const newIndex = new Map<BlockInstance, number>();

    for (const entry of this.firingPlan) {
      const existing = this.blocks.get(toKey(entry.coord));
      const isStillPresent = existing?.block === entry.block;

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
   * Removes a weapon from the firing plan using swap-and-pop for O(1) deletion.
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

  // === Fuel Tanks

  public getFuelTankBlocks(): Iterable<BlockInstance> {
    return this.fuelTankBlocks;
  }

  public updateFuelCapacity(): void {
    let totalCapacity = 0;

    for (const block of this.fuelTankBlocks) {
      const behavior = block.type.behavior;
      if (behavior?.fuelCapacityIncrease) {
        totalCapacity += behavior.fuelCapacityIncrease;
      }
    }

    if (this.afterburnerComponent) {
      this.afterburnerComponent.setMax(totalCapacity);
    }
  }

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

    for (const { block } of this.blocks.values()) {
      const behavior = block.type.behavior;

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

  public getEngineBlocks(): Iterable<BlockInstance> {
    return this.engineBlocks;
  }

  public getFinBlocks(): Iterable<BlockInstance> {
    return this.finBlocks;
  }

  public getHeatSeekerBlocks(): Map<BlockInstance, number> {
    return this.heatSeekerBlocks;
  }

  public rebuildHeatSeekerIndex(): void {
    this.heatSeekerBlocks.clear();

    for (const { block } of this.blocks.values()) {
      const behavior = block.type.behavior;
      if (behavior?.fire?.fireType === 'heatSeeker') {
        this.heatSeekerBlocks.set(block, block.type.tier);
      }
    }
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

    for (const { block } of this.blocks.values()) {
      const halo = block.type.behavior?.haloBladeProperties;
      if (halo) {
        this.haloBladeBlocks.set(block, halo);
      }
    }
  }

  private rebuildEngineBlockIndex(): void {
    this.engineBlocks.clear();

    for (const { block } of this.blocks.values()) {
      if (block.type.behavior?.canThrust) {
        this.engineBlocks.add(block);
      }
    }
  }

  private rebuildFinBlockIndex(): void {
    this.finBlocks.clear();

    for (const { block } of this.blocks.values()) {
      if (block.type.id.startsWith('fin')) {
        this.finBlocks.add(block);
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
      ownerFaction: this.faction,
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
    this.blocks.set(key, { coord, block });
    this.grid.addBlockToCell(block);
    this.blockToCoordMap.set(block, coord);

    // Register block-to-object index
    BlockToObjectIndex.registerBlock(block, this);

    // Track if it's a shield block
    if (block.type.behavior?.shieldRadius) {
      this.shieldBlocks.add(block);
    }

    // Engine blocks
    if (block.type.id.startsWith('engine')) {
      this.engineBlocks.add(block);
    }

    // Fins
    if (block.type.id.startsWith('fin')) {
      this.finBlocks.add(block);
    }

    // Harvest Blocks
    const harvestRate = block.type.behavior?.harvestRate;
    if (harvestRate) {
      this.harvesterBlocks.set(block, harvestRate);
    }

    // Haloblades
    const halo = block.type.behavior?.haloBladeProperties;
    if (halo) {
      this.haloBladeBlocks.set(block, halo);
    }

    // Heat Seekers
    if (block.type.behavior?.fire?.fireType === 'heatSeeker') {
      this.heatSeekerBlocks.set(block, block.type.tier);
    }

    // Fuel Tanks
    if (block.type.id.startsWith('fuelTank')) {
      this.fuelTankBlocks.add(block);
    }

    this.updateFuelCapacity();
    this.invalidateMass();
    this.invalidateBlockCache();
    this.recomputeEnergyStats();
    this.addWeaponToPlanIfApplicable(coord, block);
    this.shieldComponent.recalculateCoverage();
    this.markRasterDirty();
  }

  public removeBlock(coord: GridCoord): void {
    const key = toKey(coord);
    const entry = this.blocks.get(key);
    if (!entry) return;

    const { block } = entry;

    // Remove from spatial partitioning grid
    this.grid.removeBlockFromCell(block);

    // Remove from tracking maps
    this.blockToCoordMap.delete(block);
    this.blocks.delete(key);

    // Remove from subsystem indices
    this.engineBlocks.delete(block);
    this.finBlocks.delete(block);
    this.harvesterBlocks.delete(block);
    this.shieldBlocks.delete(block);
    this.haloBladeBlocks.delete(block);
    this.heatSeekerBlocks.delete(block);
    this.fuelTankBlocks.delete(block);

    this.removeWeaponFromPlanIfApplicable(block);

    // Unregister from global index
    BlockToObjectIndex.unregisterBlock(block);

    // Recompute ship state
    this.updateFuelCapacity();
    this.invalidateMass();
    this.invalidateBlockCache();
    this.recomputeEnergyStats();
    this.shieldComponent.recalculateCoverage();
    this.markRasterDirty();
  }

  public removeBlocks(coords: GridCoord[], preResolvedBlocks?: BlockInstance[]): void {
    if (coords.length === 0) return;

    const blocksToRemove: BlockInstance[] = preResolvedBlocks ?? [];

    if (!preResolvedBlocks) {
      for (const coord of coords) {
        const key = toKey(coord);
        const entry = this.blocks.get(key);
        if (!entry) continue;

        const { block } = entry;
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

    if (blocksToRemove.length === 0) return;

    // Step 2: Remove from grid in batch
    this.grid.removeBlocksFromCells(blocksToRemove);

    // Step 3: Bulk-remove from subsystems
    for (const block of blocksToRemove) {
      this.engineBlocks.delete(block);
      this.finBlocks.delete(block);
      this.harvesterBlocks.delete(block);
      this.shieldBlocks.delete(block);
      this.haloBladeBlocks.delete(block);
      this.heatSeekerBlocks.delete(block);
      this.fuelTankBlocks.delete(block);
      BlockToObjectIndex.unregisterBlock(block);
    }

    this.removeWeaponsFromPlan(blocksToRemove);

    // Step 4: Recompute affected state only once
    this.updateFuelCapacity();
    this.invalidateMass();
    this.invalidateBlockCache();
    this.recomputeEnergyStats();
    this.shieldComponent.recalculateCoverage();
    this.markRasterDirty();
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
      .find(([, entry]) => entry.block.type.id.startsWith('cockpit'))?.[0]
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

    this.updateFuelCapacity();
    this.validateFiringPlan();
    this.rebuildHaloBladeIndex();
    this.rebuildEngineBlockIndex();
    this.rebuildFinBlockIndex();
    this.rebuildHeatSeekerIndex();
    this.markRasterDirty();
  }

  // What about this?
  public destroyInstantly(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.deathTimestamp = performance.now() - 10000;

    for (const { block } of this.blocks.values()) {
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
    this.markRasterDirty();

    this.onDestroyed();
  }

  // What about this? <----
  public onDestroyedCallback(callback: ShipDestroyedCallback): void {
    if (this.destroyed) {
      callback(this);
      return;
    }
    this.destroyedListeners.push(callback);
  }

  public onDestroyed(): void {
    this.cleanupAuraLight();

    ShipRegistry.getInstance().remove(this);

    const gl = CanvasManager.getInstance().getWebGL2Context('unifiedgl2');

    // --- Clean up GPU texture ---
    if (this.rasterizedTexture && gl.isTexture(this.rasterizedTexture)) {
      gl.deleteTexture(this.rasterizedTexture);
      this.rasterizedTexture = null;
    }

    for (const cb of this.destroyedListeners) {
      cb(this);
    }
    this.destroyedListeners.length = 0;
    if (this.isPlayerShip) {
      emitPlayerDefeat();
    }
  }
}
