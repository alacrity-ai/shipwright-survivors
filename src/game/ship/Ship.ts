// src/game/ship/Ship.ts

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { SerializedShip } from '@/systems/serialization/ShipSerializer';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';
import type { WeaponFiringPlanEntry } from '@/systems/combat/types/WeaponTypes';
import type { TurretClassId, TurretSequenceState } from '@/systems/combat/types/WeaponTypes';
import type { HaloBladeProperties } from '@/game/interfaces/behavior/HaloBladeProperties';
import type { PassiveId } from '@/game/player/PlayerPassiveManager';
import type { BlockType } from '@/game/interfaces/types/BlockType';
import type { ShipSkillEffectMetadata } from '@/game/ship/skills/interfaces/ShipSkillEffectMetadata';
import type { StatusEffectType } from '@/game/ship/interfaces/ShipStatusEffects';
import type { StatusEffect } from '@/game/ship/status/StatusEffect';
import type { ArtifactEffectMetadata } from '@/game/ship/artifacts/interfaces/ArtifactEffectMetadata';

import { hashStringToInt32 } from '@/shared/hashUtils';
import { reportQuestStepUpdated } from '@/core/interfaces/events/QuestReporter';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { getAggregatedPowerupEffects } from '@/game/powerups/runtime/ActivePowerupEffectResolver';
import { PowerupEffectMetadata } from '../powerups/types/PowerupMetadataTypes';
import { PlayerPassiveManager } from '../player/PlayerPassiveManager';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { FiringMode } from '@/systems/combat/types/WeaponTypes';
import { PlayerStats } from '@/game/player/PlayerStats';
import { createPointLight } from '@/lighting/lights/createPointLight';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import { getBlockType, getBlockTypeByIndex, getBlockIndexByType } from '@/game/blocks/BlockRegistry';
import { FACTION_TO_INDEX } from '@/game/interfaces/types/Faction';
import { EnergyComponent } from '@/game/ship/components/EnergyComponent';
import { ShieldComponent } from '@/game/ship/components/ShieldComponent';
import { AfterburnerComponent } from './components/AfterburnerComponent';
import { Faction } from '@/game/interfaces/types/Faction';
import { StatusEffectFactory } from '@/game/ship/status/StatusEffectFactory';

import { initiateJump } from '@/core/interfaces/events/PlanetMenusReporter';
import { ShipRasterizationService } from '@/rendering/services/ShipRasterizationService';
import { GlobalSpriteRequestBus } from '@/rendering/unified/bus/SpriteRenderRequestBus';
import type { SpriteRenderRequest } from '@/rendering/unified/interfaces/SpriteRenderRequest';
import { CanvasManager } from '@/core/CanvasManager';
import { emitPlayerDefeat } from '@/core/interfaces/events/PlayerOutcomeReporter';

import { 
  HEATSEEKER_MAX_EMIT_PROBABILITY, 
  HEATSEEKER_MIN_EMIT_PROBABILITY, 
  HEATSEEKER_SMOKE_PARTICLE_BUDGET_PER_FRAME 
} 
from '@/config/graphicsConfig';

type ShipDestroyedCallback = (ship: Ship, cause: string) => void;

export class Ship extends CompositeBlockObject {
  private afterburnerComponent: AfterburnerComponent | null = null;
  private energyComponent: EnergyComponent | null = null;
  private shieldComponent: ShieldComponent;

  // Index-based containers (store indices, not BlockInstances)
  private shieldBlocks: Set<number> = new Set();
  private engineBlocks: Set<number> = new Set();
  private finBlocks: Set<number> = new Set();
  private fuelTankBlocks: Set<number> = new Set();
  private firingPlan: WeaponFiringPlanEntry[] = [];
  private firingPlanIndex: Map<number, number> = new Map();
  private turretSequenceState: Record<TurretClassId, TurretSequenceState> = {};
  private firingMode: FiringMode = FiringMode.Synced;
  private harvesterBlocks: Map<number, number> = new Map(); // index → harvestRate
  private haloBladeBlocks: Map<number, HaloBladeProperties> = new Map();
  private heatSeekerBlocks: Map<number, number> = new Map(); // index → tier
  private heatSeekerEmitProbability: number = HEATSEEKER_MAX_EMIT_PROBABILITY;

  private isPlayerShip: boolean;
  private destroyedListeners: ShipDestroyedCallback[] = [];
  private lightAuraId: number | null = null;
  private thrusting: boolean = true;
  private strafingLeft: boolean = false;
  private strafingRight: boolean = false;
  private affixes: ShipAffixes = {};

  private canFire: boolean = true;

  private statusEffects: Map<StatusEffectType, StatusEffect> = new Map();

  private tags: Set<string> = new Set();

  // Fast Travel
  private homeCoordinates: { x: number; y: number } = { x: 0, y: 0 };
  private jumping: boolean = false;

  // Tracks whether engines ever existed (for boost checks)
  private hadEngines: boolean = false;
  private initialMass: number = 0;

  private constructed: boolean = false;
  private destructionCause: string = 'combat'; // default fallback

  // === Rasterization Cache ===
  private rasterizedTexture: WebGLTexture | null = null;
  private rasterizedTextureOffset: { x: number; y: number } = { x: 0, y: 0 };
  private rasterizedTextureSize: { width: number; height: number } = { width: 0, height: 0 };
  private rasterDirty: boolean = true; // true means "must rerasterize"

  protected override generateId(): { stringId: string; numericId: number } {
    const stringId = 'ship-' + Math.random().toString(36).slice(2, 9);
    const numericId = hashStringToInt32(stringId); // same hash as CompositeBlockObject
    return { stringId, numericId };
  }

  constructor(
    initialBlocks?: Array<{ coord: GridCoord; typeId: string; rotation?: number }>,
    initialTransform?: Partial<BlockEntityTransform>,
    isPlayerShip?: boolean,
    affixes?: ShipAffixes,
    faction?: Faction
  ) {
    // CompositeBlockObject now handles BlockManager & BlockOrchestrator internally
    super(initialBlocks, initialTransform, faction);

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

    if (isPlayerShip) {
      this.initializeAnchorPoints();
    } else {
      this.anchorPointComponent = null;
    }
  }

  public getPassiveManager(): PlayerPassiveManager | null {
    return this.isPlayerShip ? PlayerPassiveManager.getInstance() : null;
  }

  public getPassiveBonus(id: PassiveId): number {
    return this.getPassiveManager()?.getPassiveBonus(id) ?? 1.0;
  }

  // == Get Skilltree Bonuses
  public getSkillEffects(): ShipSkillEffectMetadata {
    if (!this.isPlayerShip) return {};
    return PlayerShipCollection.getInstance().getSkillEffectsForActiveShip();
  }

  // == Get Artifact Bonuses
  public getArtifactEffects(): ArtifactEffectMetadata {
    if (!this.isPlayerShip) return {};
    return PlayerShipCollection.getInstance().getArtifactEffectsForActiveShip();
  }

  // === Ergonomic Aggregation of Modifiers from Skills and Artifacts
  public getTotalModifiers(): ArtifactEffectMetadata & ShipSkillEffectMetadata {
    return {
      ...this.getSkillEffects(),
      ...this.getArtifactEffects(),
    };
  }

  // == Firing System

  public getCanFire(): boolean {
    return this.canFire;
  }

  public setCanFire(canFire: boolean): void {
    this.canFire = canFire;
  }

  // == Fast Travel (Town Portal)

  public getHomeCoordinates(): { x: number; y: number } {
    return this.homeCoordinates;
  }

  public setHomeCoordinates(x: number, y: number): void {
    this.homeCoordinates = { x, y };
  }

  public isJumping(): boolean {
    return this.jumping;
  }

  public setJumping(jumping: boolean): void {
    this.jumping = jumping;
  }

  public jumpHome(): boolean {
    if (!this.isPlayerShip) return false;
    const { x, y } = this.homeCoordinates;
    initiateJump(x, y);
    return true;
  }

  // == Tagging

  public addTag(tag: string): void {
    this.tags.add(tag);
  }

  public hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  public getTags(): Set<string> {
    return this.tags;
  }

  // == Affixes system
  public getAffixes(): ShipAffixes {
    return this.affixes;
  }

  public setAffixes(affixes: ShipAffixes): void {
    this.affixes = affixes;
  }

  // === Status Effects

  /**
   * Adds or refreshes a status effect.
   * - Replaces existing effect if new one has longer duration.
   * - Calls onApply() when first applied.
   */
  public addStatusEffect(type: StatusEffectType, duration: number, sourceShip: Ship | null, intensity?: number): void {
    const existing = this.statusEffects.get(type);

    if (!existing || duration > existing.getRemainingDuration()) {
      // If replacing, ensure cleanup
      existing?.onExpire?.(this);

      const newEffect = StatusEffectFactory.create(type, duration, sourceShip, intensity ?? 1);
      this.statusEffects.set(type, newEffect);
      newEffect.onApply?.(this);
    }
  }

  /** Forces removal of a status effect, calling onExpire if defined. */
  public removeStatusEffect(type: StatusEffectType): void {
    const existing = this.statusEffects.get(type);
    if (existing) {
      existing.onExpire?.(this);
      this.statusEffects.delete(type);
    }
  }

  /** Returns true if the ship currently has the specified status effect. */
  public hasStatusEffect(type: StatusEffectType): boolean {
    return this.statusEffects.has(type);
  }

  /** Retrieves the instance (for reading state like intensity), if present. */
  public getStatusEffect(type: StatusEffectType): StatusEffect | undefined {
    return this.statusEffects.get(type);
  }

  /**
   * Called every frame by ShipGrid.
   * Updates each effect and cleans up expired ones.
   */
  public updateStatusEffects(dt: number): void {
    for (const [type, effect] of this.statusEffects.entries()) {
      effect.update(dt, this);

      if (effect.isExpired()) {
        effect.onExpire?.(this);
        this.statusEffects.delete(type);
      }
    }
  }

  /**
   * Forcefully clears all active status effects.
   * Invokes onExpire() for each effect before removing.
   * Intended to be called when the ship is destroyed or permanently removed.
   */
  public clearAllStatusEffects(): void {
    if (this.statusEffects.size === 0) return;

    for (const [type, effect] of this.statusEffects.entries()) {
      try {
        effect.onExpire?.(this);
      } catch (err) {
        console.warn(`[Ship] Error while expiring status effect '${type}':`, err);
      }
    }

    this.statusEffects.clear();
  }

  // == Powerups system
  public getPowerupBonus(): PowerupEffectMetadata {
    // If the playership, return the effects, otherwise return empty
    if (!this.isPlayerShip) return {};

    return getAggregatedPowerupEffects();
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

  // Returns true only if the ship originally had engines (not a station)
  public getHasAtleastOneOriginalEngine(): boolean {
    return this.hadEngines;  // True if engines were present at spawn
  }

  public hasAnyActiveEngine(): boolean {
    return this.engineBlocks.size > 0;
  }

  public getInitialMass(): number {
    return this.initialMass;
  }

  public setInitialMass(mass: number): void {
    this.initialMass = mass;
  }

  // Constructed
  public isConstructed(): boolean {
    return this.constructed;
  }

  public setConstructed(constructed: boolean): void {
    this.constructed = constructed;
  }

  // Light
  public registerAuraLight(color: string = '#ffffff', radius: number = 128, intensity: number = 2.00): void {
    if (!LightingOrchestrator.hasInstance()) return;

    if (this.lightAuraId) return;

    this.lightAuraId = createPointLight({
      x: this.getTransform().position.x,
      y: this.getTransform().position.y,
      radius: radius,
      color: color,
      intensity: intensity,
    });
  }

  // Simply replaces the AuraLight with a new one
  public updateAuraLight(color: string = '#ffffff', radius: number = 64, intensity: number = 1.25): void {
    if (!LightingOrchestrator.hasInstance()) return;

    this.cleanupAuraLight();

    this.lightAuraId = createPointLight({
      x: this.getTransform().position.x,
      y: this.getTransform().position.y,
      radius,
      color,
      intensity,
    });
  }

  public cleanupAuraLight(): void {
    if (!this.lightAuraId) return;
    LightingOrchestrator.getInstance().removeLight(this.lightAuraId);
    this.lightAuraId = null;
  }

  public getLightAuraId(): number | null {
    return this.lightAuraId;
  }

  // Block Lights
  public turnOffAllBlockLights(): void {
    const store = this.blockManager.getBlockStore();
    const indices = this.getAllBlockIndices();
    const lightingOrchestrator = LightingOrchestrator.getInstance();
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      lightingOrchestrator.turnOffLight(store.lightId[idx]!);
    }
  }

  public turnOnAllBlockLights(): void {
    const store = this.blockManager.getBlockStore();
    const indices = this.getAllBlockIndices();
    const lightingOrchestrator = LightingOrchestrator.getInstance();
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      lightingOrchestrator.turnOnLight(store.lightId[idx]!);
    }
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

  /**
   * Returns the SOA index of the cockpit block (at local 0,0) if present.
   */
  public getCockpitIndex(): number | undefined {
    return this.getBlockIndex({ x: 0, y: 0 });
  }

  /**
   * Retrieves the cockpit block’s current HP from BlockStore.
   * Logs a warning if the cockpit block is missing.
   */
  public getCockpitHp(): number | null {
    const idx = this.getCockpitIndex();
    if (idx === undefined) {
      console.warn(`[Ship ${this.id}] Cockpit block missing.`);
      return null;
    }

    const store = this.blockManager.getBlockStore();
    return store.hp[idx];
  }

  /**
   * Returns the cockpit’s grid coordinate if present.
   */
  public getCockpitCoord(): GridCoord | undefined {
    return this.getCockpitIndex() !== undefined ? { x: 0, y: 0 } : undefined;
  }

  // === Firing Plan ===

  /**
   * Each entry now tracks a block index instead of a BlockInstance.
   */
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
   * Removes any entries whose block index is no longer valid.
   */
  public validateFiringPlan(): void {
    const valid: WeaponFiringPlanEntry[] = [];
    const newIndex = new Map<number, number>();
    const store = this.blockManager.getBlockStore();

    for (const entry of this.firingPlan) {
      const idx = entry.blockIndex;
      // A valid block index must still be allocated in the store
      if (store.isAllocated(idx)) {
        const newIndexValue = valid.length;
        valid.push(entry);
        newIndex.set(idx, newIndexValue);
      }
    }

    this.firingPlan = valid;
    this.firingPlanIndex = newIndex;
  }

  /**
   * Adds a weapon block (by index) to the firing plan if the block can fire.
   */
  private addWeaponToPlanIfApplicable(idx: number): void {
    const store = this.blockManager.getBlockStore();
    const typeIdx = store.typeIndex[idx];
    const type = getBlockTypeByIndex(typeIdx);
    const fire = type?.behavior?.fire;

    if (!fire || !type?.behavior?.canFire) return;

    const entry: WeaponFiringPlanEntry = {
      blockIndex: idx,
      coord: { x: store.localX[idx], y: store.localY[idx] },
      fireRate: fire.fireRate || 1,
      fireCooldown: 1 / (fire.fireRate || 1),
      timeSinceLastShot: 0,
    };

    const index = this.firingPlan.length;
    this.firingPlan.push(entry);
    this.firingPlanIndex.set(idx, index);
  }

  /**
   * Removes a weapon block from the firing plan using swap-and-pop.
   */
  private removeWeaponFromPlanIfApplicable(idx: number): void {
    const index = this.firingPlanIndex.get(idx);
    if (index === undefined) return;

    const lastIndex = this.firingPlan.length - 1;
    const lastEntry = this.firingPlan[lastIndex];

    // Move last entry into removed slot if needed
    if (index !== lastIndex) {
      this.firingPlan[index] = lastEntry;
      this.firingPlanIndex.set(lastEntry.blockIndex, index);
    }

    this.firingPlan.pop();
    this.firingPlanIndex.delete(idx);
  }

  /**
   * Bulk-removes multiple weapon blocks by index.
   */
  private removeWeaponsFromPlan(indices: number[]): void {
    if (indices.length === 0) return;

    const toRemove = new Set(indices);
    const newPlan: WeaponFiringPlanEntry[] = [];
    const newIndex = new Map<number, number>();

    for (const entry of this.firingPlan) {
      if (!toRemove.has(entry.blockIndex)) {
        const newIdx = newPlan.length;
        newPlan.push(entry);
        newIndex.set(entry.blockIndex, newIdx);
      }
    }

    this.firingPlan = newPlan;
    this.firingPlanIndex = newIndex;
  }

  public resetTurretSequenceState(): void {
    this.turretSequenceState = {};
  }

  // === Fuel Tanks ===

  /**
   * Returns the BlockStore indices of all fuel tank blocks on this ship.
   */
  public getFuelTankIndices(): Iterable<number> {
    return this.fuelTankBlocks;
  }

  /**
   * Recalculates the total fuel capacity contribution of all fuel tank blocks.
   * Updates the AfterburnerComponent with the new maximum fuel.
   */
  public updateFuelCapacity(): void {
    const store = this.blockManager.getBlockStore();
    let totalCapacity = 0;

    for (const idx of this.fuelTankBlocks) {
      const typeIdx = store.typeIndex[idx];
      const type = getBlockTypeByIndex(typeIdx);
      const behavior = type?.behavior;

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

  /**
   * Returns the BlockStore indices of all shield blocks on this ship.
   */
  public getShieldBlockIndices(): Iterable<number> {
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

  /**
   * Computes the total energy capacity and recharge rate of the ship
   * by iterating over all blocks and checking their behavior/metatags.
   */
  private computeEnergyStats(): { max: number; regen: number } {
    const store = this.blockManager.getBlockStore();
    const indices = this.getAllBlockIndices();

    let totalMax = 0;
    let totalRegen = 0;

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const typeIdx = store.typeIndex[idx];
      const type = getBlockTypeByIndex(typeIdx);
      const behavior = type?.behavior;
      const tags = type?.metatags ?? [];

      if (behavior?.energyMaxIncrease) {
        if (tags.includes('battery')) {
          totalMax += behavior.energyMaxIncrease * this.getPassiveBonus('battery-capacity');
        } else {
          totalMax += behavior.energyMaxIncrease;
        }
      }

      if (behavior?.energyChargeRate) {
        if (tags.includes('reactor')) {
          totalRegen += behavior.energyChargeRate * this.getPassiveBonus('charger-rate');
        } else {
          totalRegen += behavior.energyChargeRate;
        }
      }
    }

    return {
      max: totalMax,
      regen: totalRegen > 0 ? totalRegen : 10,
    };
  }

  // === Halo Blades, Engines, Fins, Heat Seekers ===

  /**
   * Returns a map of BlockStore indices to HaloBladeProperties.
   */
  public getHaloBladeIndices(): Map<number, HaloBladeProperties> {
    return this.haloBladeBlocks;
  }

  /**
   * Returns the BlockStore indices for all engine blocks.
   */
  public getEngineIndices(): Iterable<number> {
    return this.engineBlocks;
  }

  /**
   * Returns the BlockStore indices for all fin blocks.
   */
  public getFinIndices(): Iterable<number> {
    return this.finBlocks;
  }

  /**
   * Returns a map of BlockStore indices to their heat seeker tier.
   */
  public getHeatSeekerIndices(): Map<number, number> {
    return this.heatSeekerBlocks;
  }

  /**
   * Rebuilds the heat seeker index by iterating through all blocks in this ship.
   */
  public rebuildHeatSeekerIndex(): void {
    this.heatSeekerBlocks.clear();
    const store = this.blockManager.getBlockStore();
    const indices = this.getAllBlockIndices();

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const typeIdx = store.typeIndex[idx];
      const type = getBlockTypeByIndex(typeIdx);
      const behavior = type?.behavior;

      if (behavior?.fire?.fireType === 'heatSeeker') {
        this.heatSeekerBlocks.set(idx, type?.tier ?? 0);
      }
    }

    this.calculateHeatSeekerSmokeEmissionProbability(this.heatSeekerBlocks.size);
  }

  /**
   * Adjusts smoke emission probability based on the number of active heat seeker blocks.
   */
  private calculateHeatSeekerSmokeEmissionProbability(numberBlocks: number): void {
    this.heatSeekerEmitProbability = Math.min(
      HEATSEEKER_MAX_EMIT_PROBABILITY,
      Math.max(
        HEATSEEKER_MIN_EMIT_PROBABILITY,
        HEATSEEKER_SMOKE_PARTICLE_BUDGET_PER_FRAME / Math.max(1, numberBlocks)
      )
    );
  }

  public getHeatSeekerEmitProbability(): number {
    return this.heatSeekerEmitProbability;
  }

  // === Utility Systems: Harvesting, etc ===

  /**
   * Computes the ship’s total harvesting rate, adjusted by passive bonuses.
   */
  public getTotalHarvestRate(): number {
    let total = 0;
    for (const rate of this.harvesterBlocks.values()) {
      total += rate;
    }
    return total * this.getPassiveBonus('harvester-range');
  }

  /**
   * Rebuilds the halo blade block index by scanning all blocks in the ship.
   */
  private rebuildHaloBladeIndex(): void {
    this.haloBladeBlocks.clear();
    const store = this.blockManager.getBlockStore();
    const indices = this.getAllBlockIndices();

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const typeIdx = store.typeIndex[idx];
      const type = getBlockTypeByIndex(typeIdx);
      const halo = type?.behavior?.haloBladeProperties;

      if (halo) {
        this.haloBladeBlocks.set(idx, halo);
      }
    }
  }

  /**
   * Rebuilds the engine block index by scanning all blocks.
   */
  private rebuildEngineBlockIndex(): void {
    this.engineBlocks.clear();
    const store = this.blockManager.getBlockStore();
    const indices = this.getAllBlockIndices();

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const typeIdx = store.typeIndex[idx];
      const type = getBlockTypeByIndex(typeIdx);

      if (type?.behavior?.canThrust) {
        this.engineBlocks.add(idx);
        this.hadEngines = true; // Preserves legacy behavior
      }
    }
  }

  /**
   * Rebuilds the fin block index by scanning all blocks.
   */
  private rebuildFinBlockIndex(): void {
    this.finBlocks.clear();
    const store = this.blockManager.getBlockStore();
    const indices = this.getAllBlockIndices();

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const typeIdx = store.typeIndex[idx];
      const type = getBlockTypeByIndex(typeIdx);

      if (type?.metatags?.includes('fin')) {
        this.finBlocks.add(idx);
      }
    }
  }

  private static readonly armorTagToPassiveId: Record<string, PassiveId> = {
    cockpit: 'cockpit-armor',
    hull: 'hull-armor',
    facetplate: 'facetplate-armor',
  };

  private getArmorBonusForBlockType(type: BlockType): number {
    let bonus = 0;
    for (const tag of type.metatags ?? []) {
      const passiveId = Ship.armorTagToPassiveId[tag];
      if (passiveId) {
        bonus += this.getPassiveBonus(passiveId);
      }
    }
    return bonus;
  }


  // === Ship-Specific Block Placement & Removal Overrides ===

  public placeBlockById(coord: GridCoord, blockId: string, rotation: number = 0, group: number = 0): boolean {
    const type = getBlockType(blockId);
    if (!type) throw new Error(`Unknown block type: ${blockId}`);

    // Avoid placing if a block already exists at this grid coordinate
    if (this.hasBlockAt(coord)) {
      return false;
    }

    const durabilityMultiplier = this.getPassiveBonus('block-durability');
    const passiveFlatBonus = this.getArmorBonusForBlockType(type);
    const hp = Math.floor(type.armor * durabilityMultiplier + passiveFlatBonus);

    const idx = this.placeBlock(coord, blockId, rotation, group, hp);
    return idx !== -1;
  }

  /**
   * Places a block in the SOA BlockStore and updates all ship-specific indices.
   * @param coord Local grid coordinate
   * @param typeId Block type ID (registry key)
   * @param rotation Optional local rotation (radians)
   * @param hp Optional precomputed hit points (defaults to base armor)
   * @returns BlockStore index of the placed block, or -1 on failure
   */
  public placeBlock(coord: GridCoord, typeId: string, rotation: number = 0, group: number = 0, hp?: number): number {
    const type = getBlockType(typeId);
    if (!type) return -1;

    const typeIndex = getBlockIndexByType(typeId) ?? 0;
    const factionIndex = FACTION_TO_INDEX[this.faction];
    const store = this.blockManager.getBlockStore();

    // Compute HP if not provided
    const computedHp = hp ?? type.armor;

    // Allocate block in BlockStore + grid via Orchestrator
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

    if (idx === -1) {
      return -1; // Allocation failed (capacity limit reached)
    }

    // Initialize HP
    store.hp[idx] = computedHp;

    // Track in subsystem indices
    const behavior = type.behavior ?? {};

    if (behavior.shieldRadius) {
      this.shieldBlocks.add(idx);
    }

    if (type.metatags?.includes('engine')) {
      this.engineBlocks.add(idx);
      this.hadEngines = true;
    }

    if (type.metatags?.includes('fin')) {
      this.finBlocks.add(idx);
    }

    if (behavior.harvestRate) {
      this.harvesterBlocks.set(idx, behavior.harvestRate);
    }

    const halo = behavior.haloBladeProperties;
    if (halo) {
      this.haloBladeBlocks.set(idx, halo);
    }

    if (behavior.fire?.fireType === 'heatSeeker') {
      this.heatSeekerBlocks.set(idx, type.tier ?? 0);
    }

    if (type.metatags?.includes('fuelTank')) {
      this.fuelTankBlocks.add(idx);
    }

    // Quest trigger for tier 5 blocks (player ship only)
    if (type.tier === 5 && this.isPlayerShip) {
      reportQuestStepUpdated('tier5BlocksAttached', 1);
    }

    // Update derived ship state
    this.updateFuelCapacity();
    this.invalidateMass();
    this.recomputeEnergyStats();
    this.calculateHeatSeekerSmokeEmissionProbability(this.heatSeekerBlocks.size);
    this.addWeaponToPlanIfApplicable(idx);
    this.shieldComponent.recalculateCoverage();
    this.markRasterDirty();

    return idx;
  }

  public removeBlock(coord: GridCoord): void {
    const idx = this.getBlockIndex(coord);
    if (idx === undefined) return;

    // Remove from subsystem indices
    this.engineBlocks.delete(idx);
    this.finBlocks.delete(idx);
    this.harvesterBlocks.delete(idx);
    this.shieldBlocks.delete(idx);
    this.haloBladeBlocks.delete(idx);
    this.heatSeekerBlocks.delete(idx);
    this.fuelTankBlocks.delete(idx);

    // Remove from firing plan
    this.removeWeaponFromPlanIfApplicable(idx);

    // Free from BlockStore + deregister from BlockSpatialGrid
    this.blockOrchestrator.destroyBlock(idx);

    // Update derived ship state
    this.updateFuelCapacity();
    this.invalidateMass();
    this.recomputeEnergyStats();
    this.calculateHeatSeekerSmokeEmissionProbability(this.heatSeekerBlocks.size);
    this.shieldComponent.recalculateCoverage();
    this.markRasterDirty();
  }

  public removeBlocks(coords: GridCoord[]): void {
    if (coords.length === 0) return;

    const indicesToRemove: number[] = [];

    // Resolve block indices from provided coordinates
    for (const coord of coords) {
      const idx = this.getBlockIndex(coord);
      if (idx !== undefined) {
        indicesToRemove.push(idx);
      }
    }

    if (indicesToRemove.length === 0) return;

    // Step 1: Clean up subsystem tracking and firing plan
    for (const idx of indicesToRemove) {
      this.engineBlocks.delete(idx);
      this.finBlocks.delete(idx);
      this.harvesterBlocks.delete(idx);
      this.shieldBlocks.delete(idx);
      this.haloBladeBlocks.delete(idx);
      this.heatSeekerBlocks.delete(idx);
      this.fuelTankBlocks.delete(idx);

      this.removeWeaponFromPlanIfApplicable(idx);
    }

    // Step 2: Bulk-destroy in BlockStore + deregister from BlockSpatialGrid
    for (const idx of indicesToRemove) {
      this.blockOrchestrator.destroyBlock(idx);
    }

    // Step 3: Update derived ship state (only once)
    this.updateFuelCapacity();
    this.invalidateMass();
    this.recomputeEnergyStats();
    this.calculateHeatSeekerSmokeEmissionProbability(this.heatSeekerBlocks.size);
    this.shieldComponent.recalculateCoverage();
    this.markRasterDirty();
  }

  /**
   * Returns true if removing the block at the given grid coordinate would not
   * disconnect the remaining blocks (i.e., the rest of the ship stays connected).
   */
  public isDeletionSafe(coord: GridCoord): boolean {
    const indices = this.blockOrchestrator.getShipBlocksView(this.numericId);
    if (indices.length === 0) return true;

    const store = this.blockManager.getBlockStore();

    // Build a set of coordinate keys for all blocks except the one being removed
    const coordSet: Set<string> = new Set();
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const x = store.localX[idx];
      const y = store.localY[idx];
      if (x === coord.x && y === coord.y) continue; // skip the target
      coordSet.add(`${x},${y}`);
    }

    if (coordSet.size === 0) {
      return true; // Nothing left, trivially safe
    }

    // Pick a root for the flood-fill: prefer a cockpit if one exists
    let rootKey: string | undefined;
    for (const key of coordSet) {
      const [x, y] = key.split(',').map(Number);
      const typeIdx = store.typeIndex[
        indices.find(idx => store.localX[idx] === x && store.localY[idx] === y)!
      ];
      const type = getBlockTypeByIndex(typeIdx);
      if (type?.metatags?.includes('cockpit')) {
        rootKey = key;
        break;
      }
    }
    if (!rootKey) {
      // fallback: just use the first block
      rootKey = coordSet.values().next().value;
    }

    // Flood-fill from rootKey to count connected blocks
    const visited = new Set<string>();
    const queue: string[] = [rootKey!];

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
        if (coordSet.has(n) && !visited.has(n)) {
          queue.push(n);
        }
      }
    }

    // Safe if all remaining blocks are reachable
    return visited.size === coordSet.size;
  }

  public loadFromJson(data: SerializedShip): void {
    const transform = this.getTransform();
    transform.position = data.transform.position;
    transform.rotation = data.transform.rotation;

    // Ensure a ship block list exists in orchestrator
    this.blockOrchestrator.ensureShipBlocks(this.numericId);

    // Populate blocks via orchestrator
    for (const { coord, id, rotation, group } of data.blocks) {
      this.placeBlockById(coord, id, rotation, group);
    }

    // Rebuild derived systems
    this.updateFuelCapacity();
    this.validateFiringPlan();
    this.rebuildHaloBladeIndex();
    this.rebuildEngineBlockIndex();
    this.rebuildFinBlockIndex();
    this.rebuildHeatSeekerIndex();

    // Update positions and grid immediately
    this.blockOrchestrator.updateShipBlocks(this.numericId, this.transform);

    // Only register collision box for non-player ships
    if (!this.isPlayerShip) {
      this.registerCollisionBox();
    }

    this.markRasterDirty();
  }

  public setDestructionCause(cause: string): void {
    this.destructionCause = cause;
  }

  public destroyInstantly(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.deathTimestamp = performance.now() - 10000;

    // Completely clear all blocks for this ship (frees BlockStore slots and removes from grid)
    this.blockOrchestrator.clearShip(this.numericId);


    // Clear Collision Box
    this.clearCollisionBox();

    // --- Aura Light Cleanup ---
    this.cleanupAuraLight();

    // Notify all registered listeners
    for (const callback of this.destroyedListeners) {
      callback(this, this.destructionCause);
    }
    this.destroyedListeners.length = 0;

    this.markRasterDirty();

    this.onDestroyed();
  }

  public clearCollisionBox(): void {
    const boxIndex = this.collisionBoxOrchestrator.getBoxIndexByShipId(this.numericId);
    if (boxIndex !== undefined) {
      this.collisionBoxOrchestrator.destroyCollisionBox(boxIndex);
    }
  }

  public onDestroyedCallback(callback: ShipDestroyedCallback): void {
    if (this.destroyed) {
      callback(this, this.destructionCause);
      return;
    }
    this.destroyedListeners.push(callback);
  }

  public onDestroyed(): void {
    this.cleanupAuraLight();

    ShipRegistry.getInstance().remove(this);

    const gl = CanvasManager.getInstance().getWebGL2Context('unifiedgl2');

    // Clear statuses
    this.clearAllStatusEffects();

    // --- Clean up GPU texture ---
    if (this.rasterizedTexture && gl.isTexture(this.rasterizedTexture)) {
      gl.deleteTexture(this.rasterizedTexture);
      this.rasterizedTexture = null;
    }

    for (const cb of this.destroyedListeners) {
      cb(this, this.destructionCause);
    }
    this.destroyedListeners.length = 0;
    if (this.isPlayerShip) {
      emitPlayerDefeat();
    }
  }
}
