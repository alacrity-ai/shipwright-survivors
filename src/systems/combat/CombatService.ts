// src/game/ship/CombatService.ts

import type { Ship } from '@/game/ship/Ship';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import { getConnectedBlockCoords, fromKey } from '@/game/ship/utils/shipBlockUtils';
import { ShipDestructionService } from '@/game/ship/ShipDestructionService';
import { DEFAULT_EXPLOSION_SPARK_PALETTE } from '@/game/blocks/BlockColorSchemes';

export class CombatService {
  constructor(
    private readonly explosionSystem: ExplosionSystem,
    private readonly pickupSpawner: PickupSpawner,
    private readonly destructionService: ShipDestructionService
  ) {}

  public applyDamageToBlock(
    ship: Ship,
    block: BlockInstance,
    coord: GridCoord,
    damage: number,
    cause: 'projectile' | 'bomb' | 'collision' | 'laser' | 'explosiveLance' | 'explosiveLanceAoE' | 'scripted' = 'scripted'
  ): boolean {
    // === Attempt shield absorption ===
    if (block.isShielded) {
      const energy = ship.getEnergyComponent();
      const efficiency = block.shieldEfficiency ?? 0;

      if (efficiency > 0) {
        const clampedEfficiency = Math.max(0.001, efficiency);
        const energyCost = damage / clampedEfficiency;

        if (energy && energy.spend(energyCost)) {
          if (block.position) {
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

    if (block.hp > 0) return false;

    const isCockpit = block.type.id.startsWith('cockpit');

    this.explosionSystem.createBlockExplosion(
      ship.getTransform().position,
      ship.getTransform().rotation,
      coord,
      70 * (isCockpit ? 2 : 1),
      0.7 * (isCockpit ? 2 : 1),
      undefined,
      DEFAULT_EXPLOSION_SPARK_PALETTE
    );

    this.pickupSpawner.spawnPickupOnBlockDestruction(block);
    ship.removeBlock(coord);

    if (isCockpit) {
      this.destructionService.destroyShip(ship, cause);
      return true;
    }

    const cockpitCoord = ship.getCockpitCoord?.();
    if (!cockpitCoord) return true;

    // === Prune disconnected fragments ===
    const connectedSet = getConnectedBlockCoords(ship, cockpitCoord);
    const blockMap = ship.getBlockMap();
    const orphanCoords: GridCoord[] = [];
    const orphanBlocks: BlockInstance[] = [];

    for (const [coordKey, orphanBlock] of blockMap.entries()) {
      if (connectedSet.has(coordKey)) continue;

      const blockCoord = fromKey(coordKey);

      this.explosionSystem.createBlockExplosion(
        ship.getTransform().position,
        ship.getTransform().rotation,
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
      ship.removeBlocks(orphanCoords, orphanBlocks);
    }

    return true;
  }
}
