// src/systems/combat/CombatService.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import type { FloatingTextManager } from '@/rendering/floatingtext/FloatingTextManager';
import type { DestructionCause } from '@/game/ship/CompositeBlockDestructionService';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';

import { getAggregatedSkillEffects } from '@/game/ship/skills/runtime/UnlockedShipSkillTreeResolver';
import { repairBlockViaLifesteal } from '../pickups/helpers/repairAllBlocksWithHealing';
import { Camera } from '@/core/Camera';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { Ship } from '@/game/ship/Ship';
import { missionLoader } from '@/game/missions/MissionLoader';
import { getConnectedBlockCoords, fromKey } from '@/game/ship/utils/shipBlockUtils';
import { CompositeBlockDestructionService } from '@/game/ship/CompositeBlockDestructionService';
import { DEFAULT_EXPLOSION_SPARK_PALETTE } from '@/game/blocks/BlockColorSchemes';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';

export class CombatService {
  constructor(
    private readonly explosionSystem: ExplosionSystem,
    private readonly pickupSpawner: PickupSpawner,
    private readonly destructionService: CompositeBlockDestructionService,
    private readonly shipBuilderEffects: ShipBuilderEffectsSystem,
    private readonly floatingTextManager?: FloatingTextManager
  ) {}

  public applyDamageToBlock(
    entity: CompositeBlockObject, // The entity receiving the damage
    source: CompositeBlockObject, // The entity dealing the damage
    block: BlockInstance, // The block receiving the damage
    coord: GridCoord,
    damage: number,
    cause: 'turret' | 'projectile' | 'bomb' | 'collision' | 'laser' | 'explosiveLance' | 'explosiveLanceAoE' | 'heatSeekerDirect' | 'heatSeekerAoE' | 'haloBlade' | 'scripted' | 'reflected' = 'scripted',
    lightFlash: boolean = true,
    baseCriticalChance: number = 0,
    baseCriticalMultiplier: number = 1.5
  ): boolean {
    if (block.indestructible) return false;

    // === Local caches for fast repeated logic ===
    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    const isSourceShip = source instanceof Ship;
    const isEntityShip = entity instanceof Ship;
    const isEntityPlayer = isEntityShip && entity.getIsPlayerShip();
    const isSourcePlayer = isSourceShip && source.getIsPlayerShip();
    const affixes = isEntityShip ? entity.getAffixes() : undefined;
    const sameFaction = source.getFaction() === entity.getFaction();
    const rawDamage = damage;

    if (sameFaction) return false;

    // === Mission difficulty adjustment ===
    const enemyPower = missionLoader.getEnemyPower();

    if (isSourcePlayer && !isEntityPlayer) {
      damage /= enemyPower;
    } else if (!isSourcePlayer && isEntityPlayer) {
      damage *= enemyPower;
    }

    // === Invulnerability check (non-scripted damage still plays effects) ===
    if (affixes?.invulnerable && cause !== 'scripted') {
      return false;
    }

    // === Ship shield absorption
    if (block.isShielded && isEntityShip) {
      const energy = entity.getEnergyComponent?.();
      const efficiency = block.shieldEfficiency ?? 0;

      if (efficiency > 0) {
        const clampedEfficiency = Math.max(0.001, efficiency);
        const energyCost = damage / clampedEfficiency;

        if (energy && energy.spend(energyCost)) {
          if (block.position) {
            // Optional lighting
            const lightingEnabled = PlayerSettingsManager.getInstance().isLightingEnabled();
            const lightOptions = lightingEnabled && cause !== 'collision'
              ? {
                  lightRadiusScalar: Math.random() * 5 + 5,
                  lightIntensity: 1.2,
                  lightLifeScalar: 0.5,
                  lightColor: '#00ffff',
                }
              : undefined;

            playSpatialSfx(entity, playerShip, {
              file: 'assets/sounds/sfx/ship/energy-shield-hit_00.wav',
              channel: 'sfx',
              baseVolume: 0.65,
              pitchRange: [2, 2.5],
              volumeJitter: 0.1,
              maxSimultaneous: 5,
            });

            this.explosionSystem.createShieldDeflection(
              block.position,
              block.shieldSourceId ?? 'shield0',
              lightOptions
            );
          }
          return false;
        }
      }
    }

    // === Calculate Damage Mitigation via Powerups
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

    // === Special Turret Skilltree Crit Exception
    if (cause === 'turret' && isSourcePlayer) {
      const playerShipId = PlayerShipCollection.getInstance().getActiveShip()?.name;
      if (playerShipId) {
        const { turretCriticalChance = 0 } = getAggregatedSkillEffects(playerShipId);
        critChance += turretCriticalChance;
        if (critMultiplier < 1.5) critMultiplier = 1.5;
      } else {
        console.warn('[CombatService] No active player ship ID found; skipping turret crit bonus.');
      }
    }

    // === Apply crit chance
    const isReflected = cause === 'reflected';
    const canCrit = !isReflected || reflectCanCrit;
    const isCriticalHit = canCrit && Math.random() < critChance;
    if (isCriticalHit) {
      damage *= critMultiplier;
    }

    // === Apply flat damage reduction
    damage *= (1 - flatDamageReductionPercent);
    // === Apply affix-based block durability reduction
    damage /= (affixes?.blockDurabilityMulti ?? 1);
    // === Enforce minimum damage if not immune
    const isCockpit = block.type.metatags?.includes('cockpit');
    const isImmune = isCockpit && Math.random() < cockpitInvulnChance;

    if (isImmune) {
      damage = 0;
    } else {
      damage = Math.max(damage, 1);
      damage = Math.floor(damage); // Round down to nearest integer
    }
    // If crit, determine lifesteal amount
    if (isCriticalHit && lifeStealOnCrit && isSourceShip) {
      const lifestealAmount = Math.max(Math.floor(damage * critLifeStealPercent), 1);
      repairBlockViaLifesteal(source, lifestealAmount, this.shipBuilderEffects);
    }

    // === Reflect damage back to attacker ===
    if (
      reflectOnDamagePercent > 0 &&
      cause !== 'reflected' && // Prevent recursive reflection
      source instanceof Ship &&
      source !== entity // Sanity check for self-hit cases
    ) {
      const reflectedDamage = Math.floor(rawDamage * reflectOnDamagePercent);

      if (reflectedDamage > 0) {
        const reflectionDamageTargetBlock = source.getRandomBlock();
        if (reflectionDamageTargetBlock) {
          const reflectionDamageTargetCoord = source.getBlockCoord(reflectionDamageTargetBlock);
          if (reflectionDamageTargetCoord) {
          // Deal reflected damage to attacker — but prevent recursion
            this.applyDamageToBlock(
              source,
              entity, // reversed: now we are the source
              reflectionDamageTargetBlock,
              reflectionDamageTargetCoord,
              reflectedDamage,
              'reflected', // new cause
              true
            );
          }
        }
      }
    }

    // === Final fallback: direct HP reduction
    block.hp -= damage;

    // Light color for laser hits
    const LASER_HIT_LIGHT_COLOR = '#00ffff';

    // Configure light effect based on cause
    const lightOptions =
      PlayerSettingsManager.getInstance().isLightingEnabled() && cause !== 'collision' && lightFlash
        ? {
            lightRadiusScalar: 12,
            lightIntensity: 1,
            lightLifeScalar: 0.7,
            lightColor: cause === 'laser' ? LASER_HIT_LIGHT_COLOR : undefined,
          }
        : undefined;

    if (block.position) {
      let shouldExplode = true;

      if (cause === 'laser' || cause === 'collision') {
        shouldExplode = Math.random() < 0.2;
      }

      if (shouldExplode) {
        this.explosionSystem.createExplosion(
          block.position,
          20,
          0.3,
          undefined,
          DEFAULT_EXPLOSION_SPARK_PALETTE,
          lightOptions
        );
      }

      const worldX = entity.getTransform().position.x + coord.x;
      const worldY = entity.getTransform().position.y + coord.y;

      this.floatingTextManager?.createWorldText(
        `${Math.floor(damage)}`,
        worldX,
        worldY,
        Camera.getInstance(),
        10,
        'monospace',
        0.8,
        140,
        1.0,
        '#FFFFFF',
        { impactScale: isCriticalHit ? 3.0 : 1.5, multiColor: isCriticalHit ?? false }, 
        block.ownerShipId,
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

    if (block.hp > 0) return false;

    // === Invariant: destroying center block (0,0) destroys entire object ===
    const isCenterBlock = coord.x === 0 && coord.y === 0;
    if (isCenterBlock) {
      this.destructionService.destroyEntity(entity, cause);
      return true;
    }

    this.explosionSystem.createBlockExplosion(
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
    this.pickupSpawner.spawnPickupOnBlockDestruction(block, blockDropRateMulti);
    entity.removeBlock(coord);
    if (entity instanceof Ship && entity.getIsPlayerShip?.()) {
      missionResultStore.incrementBlocksLost(1);
    }

    // === Ship-only destruction invariants ===
    if (entity instanceof Ship) {
      if (isCockpit) {
        this.destructionService.destroyEntity(entity, cause);

        playSpatialSfx(entity, playerShip, {
          file: 'assets/sounds/sfx/explosions/explosion_01.wav',
          channel: 'sfx',
          baseVolume: 0.8,
          pitchRange: [0.9, 1.4],
          volumeJitter: 0.2,
        });

        return true;
      }

      const cockpitCoord = entity.getCockpitCoord?.();
      if (!cockpitCoord) return true;

      const transform = entity.getTransform();

      // === Prune disconnected fragments ===
      const connectedSet = getConnectedBlockCoords(entity, cockpitCoord);
      const blockMap = entity.getBlockMap();
      const orphanCoords: GridCoord[] = [];
      const orphanBlocks: BlockInstance[] = [];

      for (const [coordKey, orphanBlock] of blockMap.entries()) {
        if (connectedSet.has(coordKey)) continue;

        const blockCoord = fromKey(coordKey);

        this.explosionSystem.createBlockExplosion(
          transform.position,
          transform.rotation,
          blockCoord,
          60 + Math.random() * 20,
          0.5 + Math.random() * 0.3,
          undefined,
          DEFAULT_EXPLOSION_SPARK_PALETTE,
        );

        const blockDropRateMulti = entity.getAffixes()?.blockDropRateMulti ?? 1;        
        this.pickupSpawner.spawnPickupOnBlockDestruction(orphanBlock, blockDropRateMulti);
        orphanCoords.push(blockCoord);
        orphanBlocks.push(orphanBlock);
      }

      if (orphanCoords.length > 0) {
        entity.removeBlocks(orphanCoords, orphanBlocks);
        if (entity.getIsPlayerShip?.()) {
          missionResultStore.incrementBlocksLost(orphanCoords.length);
        }
      }

      // === Non-player ship invariants ===
      if (!entity.getIsPlayerShip()) {
        // === Low-block-count fallback invariant ===
        const remainingBlocks = Array.from(entity.getBlockMap().values());
        if (remainingBlocks.length <= 5) {
          return this.destroyEntireShipWithAllBlocks(entity, transform, cause);
        }
        // === Engine-loss invariant ===
        if (!entity.getHasAtleastOneOriginalEngine?.()) {
          return this.destroyEntireShipWithAllBlocks(entity, transform, cause);
        }
      }
    }

    return true;
  }

  private destroyEntireShipWithAllBlocks(
    entity: CompositeBlockObject,
    transform: { position: { x: number; y: number }; rotation: number },
    cause: DestructionCause,
  ): boolean {
    if (!(entity instanceof Ship)) {
      console.warn('[CombatService] Attempted to destroy non-Ship entity via destroyEntireShipWithAllBlocks');
      return false;
    }

    const remainingCoords: GridCoord[] = [];
    const remainingBlocks: BlockInstance[] = [];

    for (const [coordKey, block] of entity.getBlockMap()) {
      const coord = fromKey(coordKey);

      this.explosionSystem.createBlockExplosion(
        transform.position,
        transform.rotation,
        coord,
        60 + Math.random() * 30,
        0.7 + Math.random() * 0.3,
        undefined,
        DEFAULT_EXPLOSION_SPARK_PALETTE,
      );

      const blockDropRateMulti = entity.getAffixes()?.blockDropRateMulti ?? 1;      
      this.pickupSpawner.spawnPickupOnBlockDestruction(block, blockDropRateMulti);      
      remainingCoords.push(coord);
      remainingBlocks.push(block);
    }

    entity.removeBlocks(remainingCoords, remainingBlocks);
    this.destructionService.destroyEntity(entity, cause);

    playSpatialSfx(entity, ShipRegistry.getInstance().getPlayerShip(), {
      file: 'assets/sounds/sfx/explosions/explosion_01.wav',
      channel: 'sfx',
      baseVolume: 0.8,
      pitchRange: [0.9, 1.4],
      volumeJitter: 0.2,
    });

    if (entity.getIsPlayerShip?.()) {
      missionResultStore.incrementBlocksLost(remainingBlocks.length);
    }

    return true;
  }
}