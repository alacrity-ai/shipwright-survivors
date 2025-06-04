import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import { Ship } from '@/game/ship/Ship';
import { getConnectedBlockCoords, fromKey } from '@/game/ship/utils/shipBlockUtils';
import { CompositeBlockDestructionService } from '@/game/ship/CompositeBlockDestructionService';
import { DEFAULT_EXPLOSION_SPARK_PALETTE } from '@/game/blocks/BlockColorSchemes';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';

export class CombatService {
  constructor(
    private readonly explosionSystem: ExplosionSystem,
    private readonly pickupSpawner: PickupSpawner,
    private readonly destructionService: CompositeBlockDestructionService
  ) {}

  public applyDamageToBlock(
    entity: CompositeBlockObject,
    block: BlockInstance,
    coord: GridCoord,
    damage: number,
    cause: 'projectile' | 'bomb' | 'collision' | 'laser' | 'explosiveLance' | 'explosiveLanceAoE' | 'scripted' = 'scripted',
    playerShip: Ship | null = null
  ): boolean {
    if (block.indestructible) return false;

    // === Ship-only shield absorption ===
    if (block.isShielded && entity instanceof Ship) {
      const energy = entity.getEnergyComponent?.();
      const efficiency = block.shieldEfficiency ?? 0;

      if (efficiency > 0) {
        const clampedEfficiency = Math.max(0.001, efficiency);
        const energyCost = damage / clampedEfficiency;

        if (energy && energy.spend(energyCost)) {
          if (block.position) {
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
              block.shieldSourceId ?? 'shield0'
            );
          }
          return false;
        }
      }
    }

    // === Direct HP damage fallback ===
    block.hp -= damage;

    if (block.position) {
      this.explosionSystem.createExplosion(
        block.position,
        20,
        0.3,
        undefined,
        DEFAULT_EXPLOSION_SPARK_PALETTE
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

    const isCockpit = block.type.id.startsWith('cockpit');

    this.explosionSystem.createBlockExplosion(
      entity.getTransform().position,
      entity.getTransform().rotation,
      coord,
      70 * (isCockpit ? 2 : 1),
      0.7 * (isCockpit ? 2 : 1),
      undefined,
      DEFAULT_EXPLOSION_SPARK_PALETTE
    );

    playSpatialSfx(entity, playerShip, {
      file: 'assets/sounds/sfx/explosions/explosion_00.wav',
      channel: 'sfx',
      baseVolume: 1.0,
      pitchRange: [0.7, 1.0],
      volumeJitter: 0.2,
      maxSimultaneous: 3,
    });

    this.pickupSpawner.spawnPickupOnBlockDestruction(block);
    entity.removeBlock(coord);

    // === Ship-only cockpit invariants ===
    if (entity instanceof Ship) {
      if (isCockpit) {
        this.destructionService.destroyEntity(entity, cause);

        playSpatialSfx(entity, playerShip, {
          file: 'assets/sounds/sfx/explosions/explosion_01.wav',
          channel: 'sfx',
          baseVolume: 0.8,
          pitchRange: [0.7, 1.0],
          volumeJitter: 0.2,
        });

        return true;
      }

      const cockpitCoord = entity.getCockpitCoord?.();
      if (!cockpitCoord) return true;

      // === Prune disconnected fragments ===
      const connectedSet = getConnectedBlockCoords(entity, cockpitCoord);
      const blockMap = entity.getBlockMap();
      const orphanCoords: GridCoord[] = [];
      const orphanBlocks: BlockInstance[] = [];

      for (const [coordKey, orphanBlock] of blockMap.entries()) {
        if (connectedSet.has(coordKey)) continue;

        const blockCoord = fromKey(coordKey);

        this.explosionSystem.createBlockExplosion(
          entity.getTransform().position,
          entity.getTransform().rotation,
          blockCoord,
          60 + Math.random() * 20,
          0.5 + Math.random() * 0.3,
          undefined,
          DEFAULT_EXPLOSION_SPARK_PALETTE
        );

        this.pickupSpawner.spawnPickupOnBlockDestruction(orphanBlock);
        orphanCoords.push(blockCoord);
        orphanBlocks.push(orphanBlock);
      }

      if (orphanCoords.length > 0) {
        entity.removeBlocks(orphanCoords, orphanBlocks);
      }

      // === Cockpit-only final fallback ===
      const remainingBlocks = Array.from(entity.getBlockMap().values());
      if (remainingBlocks.length === 1 && remainingBlocks[0].type.id.startsWith('cockpit')) {
        const lastCoord = entity.getCockpitCoord?.();
        if (lastCoord) {
          const cockpitBlock = remainingBlocks[0];

          this.explosionSystem.createBlockExplosion(
            entity.getTransform().position,
            entity.getTransform().rotation,
            lastCoord,
            140,
            1.2,
            undefined,
            DEFAULT_EXPLOSION_SPARK_PALETTE
          );

          this.pickupSpawner.spawnPickupOnBlockDestruction(cockpitBlock);
          entity.removeBlock(lastCoord);

          this.destructionService.destroyEntity(entity, cause);

          playSpatialSfx(entity, playerShip, {
            file: 'assets/sounds/sfx/explosions/explosion_01.wav',
            channel: 'sfx',
            baseVolume: 0.8,
            pitchRange: [0.7, 1.0],
            volumeJitter: 0.2,
          });
        }
      }
    }

    return true;
  }
}
