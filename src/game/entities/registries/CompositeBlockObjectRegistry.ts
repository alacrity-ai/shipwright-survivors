// src/game/entities/registries/CompositeBlockObjectRegistry.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';

export class CompositeBlockObjectRegistry<T extends CompositeBlockObject> {
  private static instance: CompositeBlockObjectRegistry<any>; // universal singleton instance

  private readonly objects: Set<T> = new Set();
  private readonly idMap: Map<string, T> = new Map();

  private constructor() {}

  public static getInstance<T extends CompositeBlockObject>(): CompositeBlockObjectRegistry<T> {
    if (!CompositeBlockObjectRegistry.instance) {
      CompositeBlockObjectRegistry.instance = new CompositeBlockObjectRegistry<T>();
    }
    return CompositeBlockObjectRegistry.instance;
  }

  public getById(id: string): T | undefined {
    return this.idMap.get(id);
  }

  public add(obj: T): void {
    this.objects.add(obj);
    this.idMap.set(obj.id, obj);
  }

  public remove(obj: T): void {
    this.objects.delete(obj);
    this.idMap.delete(obj.id);
  }

  public getAll(): Iterable<T> {
    return this.objects;
  }

  public getAllIds(): string[] {
    return Array.from(this.idMap.keys());
  }

  public getFirst5Ids(): string[] {
    return Array.from(this.idMap.keys()).slice(0, 5);
  }

  public clear(): void {
    this.objects.clear();
    this.idMap.clear();
  }

  public count(): number {
    return this.objects.size;
  }
}
