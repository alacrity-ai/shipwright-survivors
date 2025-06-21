// src/game/spawners/AsteroidSpawningSystem.ts

import type { Grid } from '@/systems/physics/Grid';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { CompositeBlockObjectRegistry } from '@/game/entities/registries/CompositeBlockObjectRegistry';

import { CompositeBlockObjectGrid } from '@/game/entities/CompositeBlockObjectGrid';
import { AsteroidFactory } from '@/game/entities/factories/AsteroidFactory';
import { getAsteroidFieldDefinition } from '@/game/spawners/registries/asteroidFieldRegistry';
import type { AsteroidFieldDefinition } from '@/game/spawners/types/AsteroidFieldDefinition';

import { getWorldCenter, getWorldWidth, getWorldHeight } from '@/config/world';
import { Asteroid } from '../entities/Asteroid';

export class AsteroidSpawningSystem {
  private readonly factory: AsteroidFactory;

  constructor(
    grid: Grid,
    registry: CompositeBlockObjectRegistry<CompositeBlockObject>,
    objectGrid: CompositeBlockObjectGrid<CompositeBlockObject>
  ) {
    this.factory = new AsteroidFactory(grid, registry, objectGrid);
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
      x: getWorldCenter().x - getWorldWidth() / 2,
      y: getWorldCenter().y - getWorldHeight() / 2,
      width: getWorldWidth(),
      height: getWorldHeight(),
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
