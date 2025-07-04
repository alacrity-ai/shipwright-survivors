// src/game/ship/CompositeBlockDestructionService.ts

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
  | 'turret'
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
  | 'reflected'
  | 'replaced';

interface BlockDestructionStep {
  delay: number; // in seconds
  callback: () => void;
}

interface DestructionJob {
  entityId: string;
  steps: BlockDestructionStep[];
  elapsed: number;
}

export class CompositeBlockDestructionService {
  private destructionCallbacks: Set<(entity: CompositeBlockObject, cause: DestructionCause) => void> = new Set();
  private activeDestructions: Map<string, DestructionJob> = new Map();

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
    this.activeDestructions.clear(); // prevent bleedover
  }

  public update(dt: number): void {
    for (const [entityId, job] of this.activeDestructions) {
      job.elapsed += dt;

      while (job.steps.length > 0 && job.steps[0].delay <= job.elapsed) {
        const step = job.steps.shift();
        try {
          step?.callback();
        } catch (err) {
          console.error(`[CompositeBlockDestructionService] Error executing block destruction step:`, err);
        }
      }

      if (job.steps.length === 0) {
        this.activeDestructions.delete(entityId);
      }
    }
  }

  public onEntityDestroyed(callback: (entity: CompositeBlockObject, cause: DestructionCause) => void): void {
    this.destructionCallbacks.add(callback);
  }

  public offEntityDestroyed(callback: (entity: CompositeBlockObject, cause: DestructionCause) => void): void {
    this.destructionCallbacks.delete(callback);
  }

  private handleDestroyEntity = ({ entity, cause }: { entity: CompositeBlockObject; cause: DestructionCause }): void => {
    this.destroyEntity(entity, cause);
  };

  public destroyEntity(entity: CompositeBlockObject, cause: DestructionCause = 'scripted'): void {
    const transform = entity.getTransform();
    const blocks = entity.getAllBlocks();
    const entityId = entity.id;

    // Notify observers
    for (const cb of this.destructionCallbacks) {
      try {
        cb(entity, cause);
      } catch (err) {
        console.error('[CompositeBlockDestructionService] Error in destruction callback:', err);
      }
    }

    // Cleanup systems
    if (entity instanceof Ship) {
      this.shipRegistry.remove(entity);
      MovementSystemRegistry.unregister(entity);
      this.aiOrchestrator.removeControllersForShip?.(entityId);
    }

    entity.destroy();

    if (cause === 'replaced') {
      if (entity instanceof Ship) {
        entity.setDestructionCause('replaced');
      }
      return;
    } 

    const steps: BlockDestructionStep[] = [];

    // Animate primary block explosions
    blocks.forEach(([coord, block], index) => {
      const delay = index * 0.05 * 0.5;
      steps.push({
        delay,
        callback: () => {
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
        },
      });
    });

    // Handle ship-specific effects
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
      if (cockpitCoord) {
        const connectedSet = getConnectedBlockCoords(entity, cockpitCoord);
        const serialize = (c: GridCoord) => `${c.x},${c.y}`;

        for (const [coord, block] of blocks) {
          if (!connectedSet.has(serialize(coord))) {
            const delay = 0.5 + Math.random() * 0.5; // delay is arbitrary but can be tuned
            steps.push({
              delay,
              callback: () => {
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
              },
            });
          }
        }
      }
    }

    this.activeDestructions.set(entityId, {
      entityId,
      steps: steps.sort((a, b) => a.delay - b.delay), // ensure sorted order
      elapsed: 0,
    });
  }
}
