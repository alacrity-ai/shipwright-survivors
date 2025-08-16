// src/systems/combat/CombatService.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import type { FloatingTextManager } from '@/rendering/floatingtext/FloatingTextManager';
import type { BlockStore } from '@/game/blocks/system/BlockStore';
import type { DestructionCause } from '@/game/ship/CompositeBlockDestructionService';

import { BlockManager } from '@/game/blocks/system/BlockManager';
import { BlockOrchestrator } from '@/game/blocks/system/BlockOrchestrator';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';

import { DamageTextAggregator } from '@/systems/damagetext/DamageTextAggregator';

import { getAggregatedSkillEffects } from '@/game/ship/skills/runtime/UnlockedShipSkillTreeResolver';
import { repairBlockViaLifesteal } from '../pickups/helpers/repairAllBlocksWithHealing';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { Ship } from '@/game/ship/Ship';
import { missionLoader } from '@/game/missions/MissionLoader';
import { getConnectedBlockCoordsFast } from '@/game/ship/utils/shipBlockUtils';
import { CompositeBlockDestructionService } from '@/game/ship/CompositeBlockDestructionService';
import { DEFAULT_EXPLOSION_SPARK_PALETTE } from '@/game/blocks/BlockColorSchemes';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';

import { GlobalEventBus } from '@/core/EventBus';

export interface ExtraDamageOptions {
  repairOrbDropRateMulti?: number;
  hideExplosionParticlesOnHit?: boolean;
  /** When true, skip immediate connectivity prune; caller should request one later. */
  deferConnectivityPrune?: boolean;
  /** When true, skip per-hit SFX (useful for large AoE batches). */
  muteOnHitSfx?: boolean;
}

export class CombatService {
  // ── DOT relay ───────────────────────────────────────────────────────────
  private readonly handleDamageOverTime = ({ target, source, amount, cause }: {
    target: Ship;
    source: Ship | null;
    amount: number;
    cause: 'dot';
  }): void => {
    this.applyDamageToRandomBlock(
      target,
      source ?? target,
      amount,
      cause
    );
  };

  private readonly damageTextAggregator: DamageTextAggregator;
  private readonly store: BlockStore;
  private readonly orchestrator: BlockOrchestrator;

  // Reusable connectivity working sets/buffers
  private reusableConnectedSet?: Set<number>;
  private reusableWorkQueue?: GridCoord[];
  private reusableOrphanIndexBuffer?: number[];

  // Light randomization
  private readonly RANDOM_BUFFER_SIZE = 32;
  private radiusRandBuffer: number[] = [];
  private scaleRandBuffer: number[] = [];
  private randPtr = 0;

  // ── NEW: deferred prune queue ───────────────────────────────────────────
  private pruneQueue: Ship[] = [];
  private pruneQueued = new WeakSet<Ship>();
  private delayedPruneMap = new Map<Ship, number>(); // frames until enqueue

  /** Throttle: max ships to prune per frame. You can tune this. */
  private readonly MAX_DEFERRED_PRUNES_PER_FRAME = 3;

  private seedRandomBuffers(): void {
    for (let i = 0; i < this.RANDOM_BUFFER_SIZE; i++) {
      this.radiusRandBuffer[i] = Math.random();
      this.scaleRandBuffer[i] = Math.random();
    }
    this.injectSpikesEveryNth(this.radiusRandBuffer, 12, 4);
    this.injectSpikesEveryNth(this.scaleRandBuffer, 12, 4);
  }

  private injectSpikesEveryNth(buffer: number[], every: number, magnitude: number, offset = 0): void {
    for (let i = offset; i < buffer.length; i += every) buffer[i] = magnitude;
  }

  constructor(
    private readonly explosionSystem: ExplosionSystem,
    private readonly pickupSpawner: PickupSpawner,
    private readonly destructionService: CompositeBlockDestructionService,
    private readonly shipBuilderEffects: ShipBuilderEffectsSystem,
    private readonly floatingTextManager?: FloatingTextManager,
  ) {
    GlobalEventBus.on('status:damageOverTime', this.handleDamageOverTime);

    this.store = BlockManager.getInstance().getBlockStore();
    this.orchestrator = BlockManager.getInstance().getBlockOrchestrator();
    this.damageTextAggregator = DamageTextAggregator.getInstance();

    this.seedRandomBuffers();
  }

  /** Must be called on dispose to prevent ghost listeners. */
  public destroy(): void {
    GlobalEventBus.off('status:damageOverTime', this.handleDamageOverTime);
    this.pruneQueue.length = 0;
    this.pruneQueued = new WeakSet<Ship>();
    this.delayedPruneMap.clear();
  }

  private nextRandom(buffer: number[]): number {
    const val = buffer[this.randPtr];
    this.randPtr = (this.randPtr + 1) % this.RANDOM_BUFFER_SIZE;
    return val;
  }

  // ── NEW: frame update to service deferred prunes ────────────────────────
  public update(dt: number): void {
    // Advance delayed items
    if (this.delayedPruneMap.size > 0) {
      for (const [ship, frames] of this.delayedPruneMap) {
        const next = frames - 1;
        if (next <= 0) {
          this.delayedPruneMap.delete(ship);
          this.requestConnectivityPrune(ship);
        } else {
          this.delayedPruneMap.set(ship, next);
        }
      }
    }

    // Process a bounded number of prunes per frame
    let remaining = this.MAX_DEFERRED_PRUNES_PER_FRAME;
    while (remaining > 0 && this.pruneQueue.length > 0) {
      const ship = this.pruneQueue.shift()!;
      this.pruneQueued.delete(ship);
      if (!ship || ship.isDestroyed?.() || (ship as any).isDestroying?.()) {
        remaining--;
        continue;
      }
      this.pruneDisconnectedFragments(ship);
      remaining--;
    }
  }

  // ── NEW: public API for callers (e.g., ExplosiveLanceBackend) ───────────
  public requestConnectivityPrune(ship: Ship): void {
    if (!ship || ship.isDestroyed?.() || (ship as any).isDestroying?.()) return;
    if (this.pruneQueued.has(ship)) return;
    this.pruneQueued.add(ship);
    this.pruneQueue.push(ship);
  }
  /** Alias for convenience/backward-compat. */
  public queueConnectivityPrune(ship: Ship): void { this.requestConnectivityPrune(ship); }
  /** Schedule a prune a few frames later (default same-frame enqueue). */
  public scheduleConnectivityPrune(ship: Ship, framesDelay = 0): void {
    if (!ship || ship.isDestroyed?.() || (ship as any).isDestroying?.()) return;
    if (framesDelay <= 0) {
      this.requestConnectivityPrune(ship);
      return;
    }
    if (!this.pruneQueued.has(ship) && !this.delayedPruneMap.has(ship)) {
      this.delayedPruneMap.set(ship, framesDelay);
    }
  }

  // ── Public helpers ──────────────────────────────────────────────────────
  public applyDamageToRandomBlock(
    entity: CompositeBlockObject,
    source: CompositeBlockObject,
    damage: number,
    cause: 'turret' | 'projectile' | 'bomb' | 'collision' | 'laser' |
            'explosiveLance' | 'explosiveLanceAoE' | 'heatSeekerDirect' | 'flameThrower' |
            'heatSeekerAoE' | 'haloBlade' | 'dot' | 'scripted' | 'reflected' = 'scripted',
  ): void {
    if (entity.isDestroyed()) return;

    const randomIdx = entity.getRandomBlockIndex?.();
    if (randomIdx === undefined) return;

    const coord: GridCoord = {
      x: this.store.localX[randomIdx],
      y: this.store.localY[randomIdx],
    };

    this.applyDamageToBlock(entity, source, randomIdx, coord, damage, cause, false, 0, 1.5);
  }

  public applyDamageToBlock(
    entity: CompositeBlockObject,
    source: CompositeBlockObject,
    blockIndex: number,
    coord: GridCoord,
    damage: number,
    cause: 'turret' | 'projectile' | 'bomb' | 'collision' | 'laser' |
            'explosiveLance' | 'explosiveLanceAoE' | 'heatSeekerDirect' | 'flameThrower' |
            'heatSeekerAoE' | 'haloBlade' | 'dot' | 'scripted' | 'reflected' = 'scripted',
    lightFlash: boolean = true,
    baseCriticalChance: number = 0,
    baseCriticalMultiplier: number = 1.5,
    extraOptions: ExtraDamageOptions = {}
  ): boolean {
    const store = this.store;

    // Ignore further damage if destruction already orchestrated
    if ((entity as any).isDestroying?.() || (entity as Ship).hasTag?.('destructing')) {
      return false;
    }

    // === Block properties via SOA ===
    if (store.indestructible[blockIndex] || store.destroyed[blockIndex]) return false;

    const isShielded = store.isShielded[blockIndex] ?? false;
    const shieldEfficiency = store.shieldEfficiency[blockIndex] ?? 0;

    // === Local caches ===
    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    const isSourceShip = source instanceof Ship;
    const isEntityShip = entity instanceof Ship;
    const isEntityPlayer = isEntityShip && entity.getIsPlayerShip();
    const isSourcePlayer = isSourceShip && source.getIsPlayerShip();
    const affixes = isEntityShip ? entity.getAffixes() : undefined;
    const sameFaction = source.getFaction() === entity.getFaction();
    const rawDamage = damage;

    if (sameFaction) return false;

    // Mission difficulty scaling
    const enemyPower = missionLoader.getEnemyPower();
    if (isSourcePlayer && !isEntityPlayer) {
      damage /= enemyPower;
    } else if (!isSourcePlayer && isEntityPlayer) {
      damage *= enemyPower;
    }

    // Invulnerability
    if (affixes?.invulnerable && cause !== 'scripted') return false;

    // Shield absorption
    if (isShielded && isEntityShip && shieldEfficiency > 0) {
      const energy = (entity as Ship).getEnergyComponent?.();
      const clampedEfficiency = Math.max(0.001, shieldEfficiency);
      const energyCost = damage / clampedEfficiency;

      if (energy && energy.spend(energyCost)) {
        const lightingEnabled = PlayerSettingsManager.getInstance().isLightingEnabled();
        const lightOptions = lightingEnabled && cause !== 'collision'
          ? {
              lightRadiusScalar: this.nextRandom(this.radiusRandBuffer) * 5 + 5,
              lightIntensity: 1.2,
              lightLifeScalar: 0.5,
              lightColor: '#00ffff',
            }
          : undefined;

        const worldPos = {
          x: entity.getTransform().position.x + store.localX[blockIndex],
          y: entity.getTransform().position.y + store.localY[blockIndex],
        };

        playSpatialSfx(entity, playerShip, {
          file: 'assets/sounds/sfx/ship/energy-shield-hit_00.wav',
          channel: 'sfx',
          baseVolume: 0.65,
          pitchRange: [2, 2.5],
          volumeJitter: 0.1,
          maxSimultaneous: 5,
        });

        this.explosionSystem.createShieldDeflection(
          worldPos,
          'shield1',
          lightOptions
        );
        return false;
      }
    }

    // Damage mitigation & crits
    const {
      flatDamageReductionPercent = 0,
      cockpitInvulnChance = 0,
      reflectOnDamagePercent = 0,
    } = isEntityShip ? (entity as Ship).getPowerupBonus() : {};

    const globalPassiveDamage = source.getDamageMultiplier();

    let {
      critChance = 0,
      critMultiplier = 1,
      lifeStealOnCrit = false,
      critLifeStealPercent = 0,
      reflectCanCrit = false,
    } = isSourceShip ? (source as Ship).getPowerupBonus() : {};

    if (cause === 'turret' && isSourcePlayer) {
      const playerShipId = PlayerShipCollection.getInstance().getActiveShip()?.name;
      if (playerShipId) {
        const { turretCriticalChance = 0 } = getAggregatedSkillEffects(playerShipId);
        critChance += turretCriticalChance;
        if (critMultiplier < 1.5) critMultiplier = 1.5;
      }
    }

    critChance += source.getCriticalChance();
    critMultiplier += source.getCriticalMultiplier();

    const isReflected = cause === 'reflected';
    const canCrit = !isReflected || reflectCanCrit;
    const isCriticalHit = canCrit && Math.random() < critChance;
    if (isCriticalHit) damage *= critMultiplier;

    damage *= (1 + globalPassiveDamage);
    damage *= (1 - flatDamageReductionPercent);
    damage /= (affixes?.blockDurabilityMulti ?? 1);
    damage *= (1 - entity.getDamageMitigation());

    // Cockpit at (0,0)
    const isCockpit = store.localX[blockIndex] === 0 && store.localY[blockIndex] === 0;
    const isImmune = isCockpit && Math.random() < cockpitInvulnChance;
    if (isImmune) {
      damage = 0;
    } else {
      damage = Math.max(Math.floor(damage), 1);
    }

    if (isCriticalHit && lifeStealOnCrit && isSourceShip) {
      const lifestealAmount = Math.max(Math.floor(damage * critLifeStealPercent), 1);
      repairBlockViaLifesteal(source as Ship, lifestealAmount, this.shipBuilderEffects);
    }

    // Reflect
    if (
      reflectOnDamagePercent > 0 &&
      cause !== 'reflected' &&
      source instanceof Ship &&
      source !== entity
    ) {
      const reflectedDamage = Math.floor(rawDamage * reflectOnDamagePercent);
      if (reflectedDamage > 0) {
        const targetIdx = (source as Ship).getRandomBlockIndex?.();
        if (targetIdx !== undefined) {
          const targetCoord: GridCoord = {
            x: this.store.localX[targetIdx],
            y: this.store.localY[targetIdx],
          };
          this.applyDamageToBlock(
            source,
            entity,
            targetIdx,
            targetCoord,
            reflectedDamage,
            'reflected',
            true
          );
        }
      }
    }

    // Ignore chance
    const ignoreChance = entity.getIgnoreDamageChance();
    if (ignoreChance && Math.random() < ignoreChance) {
      damage = 0;
    }

    // Apply damage (ship HP or block HP)
    let actualDamage = damage;

    if (entity.hasHealth()) {
      actualDamage = entity.applyDamageToHealth(damage);
      if (entity.getCurrentHealth() <= 0) {
        this.destructionService.destroyEntity(entity, cause);
        return true;
      }
    } else {
      store.hp[blockIndex] -= damage;
      this.orchestrator.updateDamageUV(blockIndex);
    }

    // Feedback FX
    const worldX = entity.getTransform().position.x + coord.x;
    const worldY = entity.getTransform().position.y + coord.y;

    const lightOptions =
      PlayerSettingsManager.getInstance().isLightingEnabled() && cause !== 'collision' && lightFlash
        ? { lightRadiusScalar: 12, lightIntensity: 1, lightLifeScalar: 0.7, lightColor: cause === 'laser' ? '#00ffff' : undefined }
        : undefined;

    if (!extraOptions.hideExplosionParticlesOnHit) {
      const shouldExplode = cause !== 'collision' || Math.random() < 0.2;
      if (shouldExplode) {
        this.explosionSystem.createExplosion(
          entity.id,
          { x: worldX, y: worldY },
          20,
          0.3,
          undefined,
          DEFAULT_EXPLOSION_SPARK_PALETTE,
          lightOptions
        );
      }
    }

    if (!extraOptions.muteOnHitSfx) {
      playSpatialSfx(entity, playerShip, {
        file: 'assets/sounds/sfx/explosions/hit_00.wav',
        channel: 'sfx',
        baseVolume: 0.25,
        pitchRange: [0.2, 0.4],
        volumeJitter: 0.1,
        maxSimultaneous: 3,
      });
    }

    if (!entity.getIsPlayerShip()) {
      if (damage > 0) {
        this.damageTextAggregator.enqueueDamage(
          worldX, worldY, Math.floor(actualDamage),
          1, 1, 1, 1.4, isCriticalHit, `damage-${entity.id}`
        );
      }
    }

    if (store.hp[blockIndex] > 0) return false;
    store.destroyed[blockIndex] = 1;

    // Cockpit destroyed → delegate to destruction service
    const isCenterBlock = coord.x === 0 && coord.y === 0;
    if (isCenterBlock) {
      if (entity instanceof Ship) {
        return this.destroyEntireShipWithAllBlocksSOA(entity, cause);
      } else {
        this.destructionService.destroyEntity(entity, cause);
        return true;
      }
    }

    // Block-specific explosion
    this.explosionSystem.createBlockExplosion(
      entity.id,
      entity.getTransform().position,
      entity.getTransform().rotation,
      coord,
      70 * (isCockpit ? 2 : 1),
      0.7 * (isCockpit ? 2 : 1),
      undefined,
      DEFAULT_EXPLOSION_SPARK_PALETTE,
    );

    const { blockDropRateMulti = 1, entropiumDropRateMulti = 1 } = entity.getAffixes();
    this.pickupSpawner.spawnPickupOnBlockDestruction(
      blockIndex,
      blockDropRateMulti,
      entropiumDropRateMulti,
      extraOptions.repairOrbDropRateMulti
    );

    entity.removeBlock(coord);

    if (entity instanceof Ship && entity.getIsPlayerShip?.()) {
      missionResultStore.incrementBlocksLost(1);
    }

    // ── Connectivity prune (immediate or deferred) ────────────────────────
    if (!(entity instanceof Ship)) return true;

    // Skip everything if ship is already scheduled for destruction
    if ((entity as any).isDestroying?.() || entity.hasTag?.('destructing')) {
      return true;
    }

    if (extraOptions.deferConnectivityPrune) {
      // Defer to end-of-batch (e.g., Explosive Lance AoE)
      this.requestConnectivityPrune(entity);
      return true;
    }

    // Immediate prune for normal hits
    this.pruneDisconnectedFragments(entity);
    return true;
  }

  // ── Helper: full-ship destruction delegation ────────────────────────────
  private destroyEntireShipWithAllBlocksSOA(entity: Ship, cause: DestructionCause): boolean {
    entity.setDestroying(true);

    // Optional: proactively drop any pending prune tasks for this ship
    try {
      if (this.pruneQueued?.has(entity)) this.pruneQueued.delete(entity);
      if (this.delayedPruneMap?.has(entity)) this.delayedPruneMap.delete(entity);
    } catch {}

    this.destructionService.destroyEntity(entity, cause);
    return true;
  }

  // ── Core: prune + FX + pickups + invariants (used by both paths) ───────
  private pruneDisconnectedFragments(entity: Ship): void {
    if (!entity || entity.isDestroyed?.() || (entity as any).isDestroying?.()) return;

    this.reusableConnectedSet ??= new Set<number>();
    this.reusableWorkQueue ??= [];
    this.reusableOrphanIndexBuffer ??= [];

    const connected = getConnectedBlockCoordsFast(
      entity,
      { x: 0, y: 0 },
      this.reusableConnectedSet,
      this.reusableWorkQueue
    );

    const indices = entity.getAllBlockIndices();
    const transform = entity.getTransform();

    const orphanBuffer = this.reusableOrphanIndexBuffer;
    orphanBuffer.length = 0;

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const x = this.store.localX[idx];
      const y = this.store.localY[idx];
      const key = (x << 16) | (y & 0xffff);

      if (connected.has(key)) continue;

      // FX and pickup for orphaned block
      this.explosionSystem.createBlockExplosion(
        entity.id,
        transform.position,
        transform.rotation,
        { x, y },
        60 + this.nextRandom(this.radiusRandBuffer) * 20,
        0.5 + this.nextRandom(this.scaleRandBuffer) * 0.3,
        undefined,
        DEFAULT_EXPLOSION_SPARK_PALETTE,
        undefined,
        'lightless'
      );

      const dropRateMulti = entity.getAffixes?.().blockDropRateMulti ?? 1;
      this.pickupSpawner.spawnPickupOnBlockDestruction(idx, dropRateMulti);

      orphanBuffer.push(idx);
    }

    // Apply orphan pruning in one shot
    if (orphanBuffer.length > 0) {
      entity.removeBlocksByIndexFast(orphanBuffer);
      if (entity.getIsPlayerShip?.()) {
        missionResultStore.incrementBlocksLost(orphanBuffer.length);
      }
    }

    // Post-prune invariants (non-player ships)
    if (!entity.getIsPlayerShip?.()) {
      const remainingCount = entity.getAllBlockIndices().length;

      // Low block count fallback
      if (remainingCount <= 5) {
        this.destroyEntireShipWithAllBlocksSOA(entity, 'scripted');
        return;
      }

      // Engine-loss fallback
      if (entity.getHasAtleastOneOriginalEngine?.() && !entity.hasAnyActiveEngine()) {
        this.destroyEntireShipWithAllBlocksSOA(entity, 'scripted');
        return;
      }
    }
  }
}
