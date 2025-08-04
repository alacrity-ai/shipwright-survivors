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
}

export class CombatService {
  // Keep a reference to the bound EventBus handler so we can unregister it later
  private readonly handleDamageOverTime = ({ target, source, amount, cause }: {
    target: Ship;
    source: Ship | null;
    amount: number;
    cause: 'dot';
  }): void => {
    this.applyDamageToRandomBlock(
      target,
      source ?? target, // Fallback to self if source is null
      amount,
      cause
    );
  };

  private readonly damageTextAggregator: DamageTextAggregator;
  private readonly store: BlockStore
  private readonly orchestrator: BlockOrchestrator;

  private reusableConnectedSet?: Set<number>;
  private reusableWorkQueue?: GridCoord[];
  private reusableOrphanIndexBuffer?: number[];

  private readonly RANDOM_BUFFER_SIZE = 32;
  private radiusRandBuffer: number[] = [];
  private scaleRandBuffer: number[] = [];
  private randPtr = 0;

  private seedRandomBuffers(): void {
    for (let i = 0; i < this.RANDOM_BUFFER_SIZE; i++) {
      this.radiusRandBuffer[i] = Math.random(); // in [0, 1)
      this.scaleRandBuffer[i] = Math.random();
    }
    // Inject big explosion chances
    this.injectSpikesEveryNth(this.radiusRandBuffer, 12, 4);
    this.injectSpikesEveryNth(this.scaleRandBuffer, 12, 4);
  }

  private injectSpikesEveryNth(buffer: number[], every: number, magnitude: number, offset = 0): void {
    for (let i = offset; i < buffer.length; i += every) {
      buffer[i] = magnitude;
    }
  }

  constructor(
    private readonly explosionSystem: ExplosionSystem,
    private readonly pickupSpawner: PickupSpawner,
    private readonly destructionService: CompositeBlockDestructionService,
    private readonly shipBuilderEffects: ShipBuilderEffectsSystem,
    private readonly floatingTextManager?: FloatingTextManager,
  ) {
    // Register the bound handler
    GlobalEventBus.on('status:damageOverTime', this.handleDamageOverTime);

    this.store = BlockManager.getInstance().getBlockStore();
    this.orchestrator = BlockManager.getInstance().getBlockOrchestrator();
    this.damageTextAggregator = DamageTextAggregator.getInstance();

    this.seedRandomBuffers();
  }

  /**
   * Must be called when the owning runtime is disposed to prevent ghost listeners.
   */
  public destroy(): void {
    GlobalEventBus.off('status:damageOverTime', this.handleDamageOverTime);
  }

  private nextRandom(buffer: number[]): number {
    const val = buffer[this.randPtr];
    this.randPtr = (this.randPtr + 1) % this.RANDOM_BUFFER_SIZE;
    return val;
  }

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

    // Derive the GridCoord from the store's local position arrays
    const coord: GridCoord = {
      x: this.store.localX[randomIdx],
      y: this.store.localY[randomIdx],
    };

    this.applyDamageToBlock(entity, source, randomIdx, coord, damage, cause, false, 0, 1.5);
  }

  public applyDamageToBlock(
    entity: CompositeBlockObject, // The entity receiving the damage
    source: CompositeBlockObject, // The entity dealing the damage
    blockIndex: number,           // SOA index of the block
    coord: GridCoord,             // Local grid coord for world translation (still used for explosions/text)
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

    // === Block properties via SOA ===
    if (store.indestructible[blockIndex] || store.destroyed[blockIndex]) return false;

    const isShielded = store.isShielded[blockIndex] ?? false;
    const shieldEfficiency = store.shieldEfficiency[blockIndex] ?? 0;

    // === Local caches for entity/ship state ===
    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    const isSourceShip = source instanceof Ship;
    const isEntityShip = entity instanceof Ship;
    const isEntityPlayer = isEntityShip && entity.getIsPlayerShip();
    const isSourcePlayer = isSourceShip && source.getIsPlayerShip();
    const affixes = isEntityShip ? entity.getAffixes() : undefined;
    const sameFaction = source.getFaction() === entity.getFaction();
    const rawDamage = damage;

    if (sameFaction) {
      if (cause === 'laser') console.log('[CombatService] DID NOT APPLY DAMAGE DUE TO SAME FACTION');
      return false;
    }

    // === Mission difficulty scaling ===
    const enemyPower = missionLoader.getEnemyPower();
    if (isSourcePlayer && !isEntityPlayer) {
      damage /= enemyPower;
    } else if (!isSourcePlayer && isEntityPlayer) {
      damage *= enemyPower;
    }

    // === Invulnerability ===
    if (affixes?.invulnerable && cause !== 'scripted') {
      return false;
    }

    // === Shield absorption ===
    if (isShielded && isEntityShip && shieldEfficiency > 0) {
      const energy = entity.getEnergyComponent?.();
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

        // Compute world position for deflection FX
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
          'shield1', // Later on maybe slice by tier
          lightOptions
        );
        return false;
      }
    }

    // === Damage mitigation and crits ===
    const {
      flatDamageReductionPercent = 0,
      cockpitInvulnChance = 0,
      reflectOnDamagePercent = 0,
    } = isEntityShip ? entity.getPowerupBonus() : {};

    let {
      critChance = 0,
      critMultiplier = 1,
      lifeStealOnCrit = false,
      critLifeStealPercent = 0,
      reflectCanCrit = false,
    } = isSourceShip ? source.getPowerupBonus() : {};

    if (cause === 'turret' && isSourcePlayer) {
      const playerShipId = PlayerShipCollection.getInstance().getActiveShip()?.name;
      if (playerShipId) {
        const { turretCriticalChance = 0 } = getAggregatedSkillEffects(playerShipId);
        critChance += turretCriticalChance;
        if (critMultiplier < 1.5) critMultiplier = 1.5;
      }
    }

    const isReflected = cause === 'reflected';
    const canCrit = !isReflected || reflectCanCrit;
    const isCriticalHit = canCrit && Math.random() < critChance;
    if (isCriticalHit) {
      damage *= critMultiplier;
    }

    damage *= (1 - flatDamageReductionPercent);
    damage /= (affixes?.blockDurabilityMulti ?? 1);

    // Cockpit is always at 0,0 local coords
    const isCockpit = store.localX[blockIndex] === 0 && store.localY[blockIndex] === 0;
    const isImmune = isCockpit && Math.random() < cockpitInvulnChance;
    if (isImmune) {
      damage = 0;
    } else {
      damage = Math.max(damage, 1);
      damage = Math.floor(damage);
    }

    if (isCriticalHit && lifeStealOnCrit && isSourceShip) {
      const lifestealAmount = Math.max(Math.floor(damage * critLifeStealPercent), 1);
      repairBlockViaLifesteal(source, lifestealAmount, this.shipBuilderEffects);
    }

    // === Reflect damage ===
    if (
      reflectOnDamagePercent > 0 &&
      cause !== 'reflected' &&
      source instanceof Ship &&
      source !== entity
    ) {
      const reflectedDamage = Math.floor(rawDamage * reflectOnDamagePercent);
      if (reflectedDamage > 0) {
        const targetIdx = source.getRandomBlockIndex?.();
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

    // === Actual HP Decrement Occurs here ===
    let actualDamage = damage;
    if (entity.hasHealth()) {
      // HP Reduction on ship (Boss ships, special entities)
      actualDamage = entity.applyDamageToHealth(damage);
      if (entity.getCurrentHealth() <= 0) {
        this.destructionService.destroyEntity(entity, cause);
        return true;
      }
    } else {
      // Block Based Damage Reduction (normal path)
      store.hp[blockIndex] -= damage;
      this.orchestrator.updateDamageUV(blockIndex);
    }

    // === Visual + feedback (Applies to both a block hit, or a ship damage hit) ===
    const worldX = entity.getTransform().position.x + coord.x;
    const worldY = entity.getTransform().position.y + coord.y;

    const lightOptions =
      PlayerSettingsManager.getInstance().isLightingEnabled() && cause !== 'collision' && lightFlash
        ? {
            lightRadiusScalar: 12,
            lightIntensity: 1,
            lightLifeScalar: 0.7,
            lightColor: cause === 'laser' ? '#00ffff' : undefined,
          }
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

    if (!entity.getIsPlayerShip()) {
      if (damage > 0) {
        this.damageTextAggregator.enqueueDamage(
          worldX, worldY, Math.floor(actualDamage),
          1, 1, 1, 1.4, isCriticalHit, `damage-${entity.id}`
        );
      }
    }

    playSpatialSfx(entity, playerShip, {
      file: 'assets/sounds/sfx/explosions/hit_00.wav',
      channel: 'sfx',
      baseVolume: 0.25,
      pitchRange: [0.2, 0.4],
      volumeJitter: 0.1,
      maxSimultaneous: 3,
    });

    if (store.hp[blockIndex] > 0) return false;
    store.destroyed[blockIndex] = 1;

    // === Cockpit/center destruction ===
    const isCenterBlock = coord.x === 0 && coord.y === 0;
    if (isCenterBlock) {
      if (entity instanceof Ship) {
        return this.destroyEntireShipWithAllBlocksSOA(entity, cause);
      } else {
        this.destructionService.destroyEntity(entity, cause);
        return true;
      }
    }

    // Explosion effect for the destroyed block
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

    playSpatialSfx(entity, playerShip, {
      file: 'assets/sounds/sfx/explosions/explosion_00.wav',
      channel: 'sfx',
      baseVolume: 1.0,
      pitchRange: [1.0, 1.2],
      volumeJitter: 0.2,
      maxSimultaneous: 3,
    });

    const blockDropRateMulti = entity.getAffixes()?.blockDropRateMulti ?? 1;
    this.pickupSpawner.spawnPickupOnBlockDestruction(blockIndex, blockDropRateMulti, extraOptions.repairOrbDropRateMulti);

    entity.removeBlock(coord);

    if (entity instanceof Ship && entity.getIsPlayerShip?.()) {
      missionResultStore.incrementBlocksLost(1);
    }

    // === Prune disconnected fragments (SOA-based) ===
    this.reusableConnectedSet ??= new Set<number>();
    this.reusableWorkQueue ??= [];
    this.reusableOrphanIndexBuffer ??= [];

    const connected = getConnectedBlockCoordsFast(
      entity as Ship,
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

      // FX and pickup
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

    // === Apply orphan pruning ===
    if (orphanBuffer.length > 0) {
      entity.removeBlocksByIndexFast(orphanBuffer);
      if (entity.getIsPlayerShip?.()) {
        missionResultStore.incrementBlocksLost(orphanBuffer.length);
      }
    }

    // === Non-player ship destruction invariants ===
    if (entity instanceof Ship && !entity.getIsPlayerShip()) {
      const remainingCount = entity.getAllBlockIndices().length;

      // --- Low block count fallback ---
      if (remainingCount <= 5) {
        return this.destroyEntireShipWithAllBlocksSOA(entity, cause);
      }

      // --- Engine-loss fallback ---
      if (entity.getHasAtleastOneOriginalEngine?.() && !entity.hasAnyActiveEngine()) {
        return this.destroyEntireShipWithAllBlocksSOA(entity, cause);
      }
    }

    return true;
  }

  private destroyEntireShipWithAllBlocksSOA(
    entity: Ship,
    cause: DestructionCause,
  ): boolean {
    // Mark the ship as destructing to prevent reentrancy or double-handling
    entity.setDestroying(true);

    // Delegate full destruction to the CompositeBlockDestructionService
    this.destructionService.destroyEntity(entity, cause);

    return true;
  }
}
