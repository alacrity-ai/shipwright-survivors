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
import { getConnectedBlockCoords, fromKey } from '@/game/ship/utils/shipBlockUtils';
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
  }

  /**
   * Must be called when the owning runtime is disposed to prevent ghost listeners.
   */
  public destroy(): void {
    GlobalEventBus.off('status:damageOverTime', this.handleDamageOverTime);
  }

  public applyDamageToRandomBlock(
    entity: CompositeBlockObject,
    source: CompositeBlockObject,
    damage: number,
    cause: 'turret' | 'projectile' | 'bomb' | 'collision' | 'laser' |
          'explosiveLance' | 'explosiveLanceAoE' | 'heatSeekerDirect' |
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
          'explosiveLance' | 'explosiveLanceAoE' | 'heatSeekerDirect' |
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
              lightRadiusScalar: Math.random() * 5 + 5,
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
    if (entity.hasHealth()) {
      // HP Reduction on ship (Boss ships, special entities)
      entity.setCurrentHealth(entity.getCurrentHealth() - damage);
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
      this.damageTextAggregator.enqueueDamage(
        worldX, worldY, Math.floor(damage),
        1, 1, 1, 1.4, isCriticalHit, `damage-${entity.id}`
      );
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
    const connectedSet = getConnectedBlockCoords(entity as Ship, { x: 0, y: 0 });
    const indices = entity.getAllBlockIndices();

    const orphanCoords: GridCoord[] = [];
    const transform = entity.getTransform();

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const coord: GridCoord = {
        x: this.store.localX[idx],
        y: this.store.localY[idx],
      };

      const key = `${coord.x},${coord.y}`;
      if (connectedSet.has(key)) continue; // still connected

      // Spawn visual FX
      this.explosionSystem.createBlockExplosion(
        entity.id,
        transform.position,
        transform.rotation,
        coord,
        60 + Math.random() * 20,
        0.5 + Math.random() * 0.3,
        undefined,
        DEFAULT_EXPLOSION_SPARK_PALETTE,
        undefined,
        'lightless',
      );

      const blockDropRateMulti = entity.getAffixes()?.blockDropRateMulti ?? 1;
      this.pickupSpawner.spawnPickupOnBlockDestruction(idx, blockDropRateMulti);

      orphanCoords.push(coord);
    }

    // After orphan pruning:
    if (orphanCoords.length > 0) {
      entity.removeBlocks(orphanCoords);
      if (entity.getIsPlayerShip?.()) {
        missionResultStore.incrementBlocksLost(orphanCoords.length);
      }
    }

    // === Non-player ship destruction invariants ===
    if (entity instanceof Ship && !entity.getIsPlayerShip()) {
      const remainingIndices = entity.getAllBlockIndices();
      const remainingCount = remainingIndices.length;

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
    const store = this.store; // BlockStore reference
    const transform = entity.getTransform();
    const indices = entity.getAllBlockIndices();

    const coords: GridCoord[] = [];

    for (const idx of indices) {
      const coord: GridCoord = {
        x: store.localX[idx],
        y: store.localY[idx],
      };

      this.explosionSystem.createBlockExplosion(
        entity.id,
        transform.position,
        transform.rotation,
        coord,
        60 + Math.random() * 30,
        0.7 + Math.random() * 0.3,
        undefined,
        DEFAULT_EXPLOSION_SPARK_PALETTE,
        undefined,
        'lightless',
      );

      const blockDropRateMulti = entity.getAffixes()?.blockDropRateMulti ?? 1;
      this.pickupSpawner.spawnPickupOnBlockDestruction(idx, blockDropRateMulti);
      coords.push(coord);
    }

    // Remove all blocks
    entity.removeBlocks(coords);
    this.destructionService.destroyEntity(entity, cause);

    playSpatialSfx(entity, ShipRegistry.getInstance().getPlayerShip(), {
      file: 'assets/sounds/sfx/explosions/explosion_01.wav',
      channel: 'sfx',
      baseVolume: 0.8,
      pitchRange: [0.9, 1.4],
      volumeJitter: 0.2,
    });

    if (entity.getIsPlayerShip?.()) {
      missionResultStore.incrementBlocksLost(indices.length);
    }

    return true;
  }

}
