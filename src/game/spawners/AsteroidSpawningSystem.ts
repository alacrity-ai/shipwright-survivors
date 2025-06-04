// src/game/spawners/AsteroidSpawningSystem.ts

import type { Grid } from '@/systems/physics/Grid';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { CompositeBlockObjectRegistry } from '@/game/entities/registries/CompositeBlockObjectRegistry';

import { AsteroidFactory } from '@/game/entities/factories/AsteroidFactory';
import { getAsteroidFieldDefinition } from '@/game/spawners/registries/asteroidFieldRegistry';
import type { AsteroidFieldDefinition } from '@/game/spawners/types/AsteroidFieldDefinition';

import { WORLD_CENTER, WORLD_WIDTH, WORLD_HEIGHT } from '@/config/world';

export class AsteroidSpawningSystem {
  private readonly factory: AsteroidFactory;

  constructor(
    grid: Grid,
    registry: CompositeBlockObjectRegistry<CompositeBlockObject>
  ) {
    this.factory = new AsteroidFactory(grid, registry);
  }

  /**
   * Spawns all asteroids for a field by registry key.
   */
  public spawnFieldById(id: string): void {
    const def = getAsteroidFieldDefinition(id);
    if (!def) {
      console.warn(`[AsteroidSpawningSystem] Unknown field id: ${id}`);
      return;
    }
    this.spawnField(def);
  }

  /**
   * Spawns all asteroids defined in a field definition.
   */
  private spawnField(def: AsteroidFieldDefinition): void {
    const bounds = def.bounds ?? {
      x: WORLD_CENTER.x - WORLD_WIDTH / 2,
      y: WORLD_CENTER.y - WORLD_HEIGHT / 2,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
    };

    for (const config of def.asteroids) {
      for (let i = 0; i < config.count; i++) {
        const x = bounds.x + Math.random() * bounds.width;
        const y = bounds.y + Math.random() * bounds.height;

        const vx = this.randomInRange(def.velocityRange?.x ?? [-0.1, 0.1]);
        const vy = this.randomInRange(def.velocityRange?.y ?? [-0.1, 0.1]);
        const angular = this.randomInRange(def.angularVelocityRange ?? [-0.05, 0.05]);

        this.factory.createAsteroid(
          config.asteroidId,
          { x, y },
          { x: vx, y: vy },
          angular
        );
      }
    }
  }

  private randomInRange([min, max]: [number, number]): number {
    return min + Math.random() * (max - min);
  }
}
