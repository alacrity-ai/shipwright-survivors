import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';

import { GlobalEventBus } from '@/core/EventBus';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { createPointLight } from '@/lighting/lights/createPointLight';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { Ship } from '@/game/ship/Ship';
import { MovementSystemRegistry } from '@/systems/physics/MovementSystemRegistry';
import { getConnectedBlockCoords } from '@/game/ship/utils/shipBlockUtils';
import { DEFAULT_EXPLOSION_SPARK_PALETTE } from '@/game/blocks/BlockColorSchemes';

export type DestructionCause =
  | 'projectile'
  | 'collision'
  | 'bomb'
  | 'laser'
  | 'explosiveLance'
  | 'explosiveLanceAoE'
  | 'heatSeekerDirect'
  | 'heatSeekerAoE'
  | 'haloBlade'
  | 'self'
  | 'scripted'
  | 'replaced';

export class CompositeBlockDestructionService {
  private destructionCallbacks: Set<(entity: CompositeBlockObject, cause: DestructionCause) => void> = new Set();

  constructor(
    private readonly explosionSystem: ExplosionSystem,
    private readonly pickupSpawner: PickupSpawner,
    private readonly shipRegistry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem
  ) {
    GlobalEventBus.on('entity:destroy', this.handleDestroyEntity);
  }

  public destroy(): void {
    GlobalEventBus.off('entity:destroy', this.handleDestroyEntity);
    this.destructionCallbacks.clear();
  }

  public onEntityDestroyed(callback: (entity: CompositeBlockObject, cause: DestructionCause) => void): void {
    this.destructionCallbacks.add(callback);
  }

  public offEntityDestroyed(callback: (entity: CompositeBlockObject, cause: DestructionCause) => void): void {
    this.destructionCallbacks.delete(callback);
  }

  private handleDestroyEntity = ({
    entity,
    cause,
  }: {
    entity: CompositeBlockObject;
    cause: DestructionCause;
  }): void => {
    this.destroyEntity(entity, cause);
  };

  public destroyEntity(entity: CompositeBlockObject, cause: DestructionCause = 'scripted'): void {
    const transform = entity.getTransform();
    const blocks = entity.getAllBlocks();
    const entityId = entity.id;

    // === Step 0: Notify observers
    this.destructionCallbacks.forEach(callback => {
      try {
        callback(entity, cause);
      } catch (err) {
        console.error('[CompositeBlockDestructionService] Error in destruction callback:', err);
      }
    });

    // === Step 1: Cleanup systems
    if (entity instanceof Ship) {
      this.shipRegistry.remove(entity);
      MovementSystemRegistry.unregister(entity);
      this.aiOrchestrator.removeControllersForShip?.(entityId);
    }

    entity.destroy();

    if (cause === 'replaced') return;

    // === Step 2: Animate each block
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

    // === Step 3: Handle disconnected fragments for ships
    if (entity instanceof Ship) {
      if (PlayerSettingsManager.getInstance().isLightingEnabled()) {
        const lightingOrchestrator = LightingOrchestrator.getInstance();
        const light = createPointLight({
          x: transform.position.x,
          y: transform.position.y,
          radius: 4 * entity.getTotalMass(),
          color: '#ffffff',
          intensity: 1.25,
          life: 0.5,
          expires: true,
        });
        lightingOrchestrator.registerLight(light);
      }

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
          }, 50 + Math.random() * 100);
        }
      }
    }
  }
}
