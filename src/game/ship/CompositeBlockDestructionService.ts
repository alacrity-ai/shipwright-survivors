import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';

import { Ship } from '@/game/ship/Ship';
import { getConnectedBlockCoords } from '@/game/ship/utils/shipBlockUtils';
import { DEFAULT_EXPLOSION_SPARK_PALETTE } from '@/game/blocks/BlockColorSchemes';

export type DestructionCause =
  | 'projectile'
  | 'collision'
  | 'bomb'
  | 'laser'
  | 'explosiveLance'
  | 'explosiveLanceAoE'
  | 'self'
  | 'scripted';

export class CompositeBlockDestructionService {
  private destructionCallbacks: Set<(entity: CompositeBlockObject, cause: DestructionCause) => void> = new Set();

  constructor(
    private readonly explosionSystem: ExplosionSystem,
    private readonly pickupSpawner: PickupSpawner,
    private readonly shipRegistry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem,
  ) {}

  public onEntityDestroyed(callback: (entity: CompositeBlockObject, cause: DestructionCause) => void): void {
    this.destructionCallbacks.add(callback);
  }

  public offEntityDestroyed(callback: (entity: CompositeBlockObject, cause: DestructionCause) => void): void {
    this.destructionCallbacks.delete(callback);
  }

  public destroyEntity(entity: CompositeBlockObject, cause: DestructionCause = 'scripted'): void {
    const transform = entity.getTransform();
    const blocks = entity.getAllBlocks();
    const entityId = entity.id;

    // === Step 0: Notify destruction observers ===
    this.destructionCallbacks.forEach(callback => {
      try {
        callback(entity, cause);
      } catch (err) {
        console.error('Error in destruction callback:', err);
      }
    });

    // === Step 1: Pre-destruction cleanup ===
    if (entity instanceof Ship) {
      this.shipRegistry.remove(entity);
      this.aiOrchestrator.removeControllersForShip?.(entityId);
    }

    entity.destroy();

    // === Step 2: Explosion & pickup animation ===
    blocks.forEach(([coord, block], index) => {
      setTimeout(() => {
        this.explosionSystem.createBlockExplosion(
          transform.position,
          transform.rotation,
          coord,
          50 + Math.random() * 40,
          0.5 + Math.random() * 0.5,
          undefined,
          DEFAULT_EXPLOSION_SPARK_PALETTE
        );
        this.pickupSpawner.spawnPickupOnBlockDestruction(block);
      }, index * 50);
    });

    // === Step 3: Ship-only orphaned block detonation ===
    if (entity instanceof Ship) {
      const cockpitCoord = entity.getCockpitCoord?.();
      if (!cockpitCoord) return;

      const connectedSet = getConnectedBlockCoords(entity, cockpitCoord);
      const serialize = (c: GridCoord) => `${c.x},${c.y}`;

      for (const [coord, block] of blocks) {
        if (!connectedSet.has(serialize(coord))) {
          setTimeout(() => {
            this.explosionSystem.createBlockExplosion(
              transform.position,
              transform.rotation,
              coord,
              60 + Math.random() * 20,
              0.5 + Math.random() * 0.3,
              undefined,
              DEFAULT_EXPLOSION_SPARK_PALETTE
            );
            this.pickupSpawner.spawnPickupOnBlockDestruction(block);
          }, 250 + Math.random() * 300);
        }
      }
    }
  }
}
