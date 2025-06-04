// src/systems/physics/MovementSystemRegistry.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { MovementSystem } from './MovementSystem';

export class MovementSystemRegistry {
  private static readonly registry = new Map<string, MovementSystem>();

  public static register(object: CompositeBlockObject, movementSystem: MovementSystem): void {
    this.registry.set(object.id, movementSystem);
  }

  public static unregister(object: CompositeBlockObject): void {
    this.registry.delete(object.id);
  }

  public static get(object: CompositeBlockObject): MovementSystem | undefined {
    return this.registry.get(object.id);
  }

  public static clear(): void {
    this.registry.clear();
  }
}
