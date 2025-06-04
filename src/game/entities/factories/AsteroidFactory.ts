// src/game/entities/factories/AsteroidFactory.ts

// import { MovementSystem } from '@/systems/physics/MovementSystem';
// import { MovementSystemRegistry } from '@/systems/physics/MovementSystemRegistry';
// import type { Ship } from '@/game/ship/Ship';
import type { Grid } from '@/systems/physics/Grid';
import { Asteroid } from '@/game/entities/Asteroid';
import type { CompositeBlockObjectRegistry } from '@/game/entities/registries/CompositeBlockObjectRegistry';
import { loadAsteroidFromJson } from '@/systems/serialization/CompositeBlockObjectSerializer';

export class AsteroidFactory {
  public constructor(
    private readonly grid: Grid,
    private readonly registry: CompositeBlockObjectRegistry<Asteroid>
  ) {}

  public async createAsteroid(
    jsonFileName: string,
    position: { x: number; y: number },
    velocity: { x: number; y: number } = { x: 0, y: 0 },
    angularVelocity: number = 0
  ): Promise<Asteroid> {
    const asteroid = await loadAsteroidFromJson(jsonFileName + '.json', this.grid);

    const transform = asteroid.getTransform();
    transform.position = { ...position };
    transform.velocity = { ...velocity };
    transform.angularVelocity = angularVelocity;

    this.registry.add(asteroid);
    // const movement = new MovementSystem(asteroid as Ship, null as any, null as any); // TODO: Handle this
    // MovementSystemRegistry.register(asteroid, movement);

    return asteroid;
  }
}
