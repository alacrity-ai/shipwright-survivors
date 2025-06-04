import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { CompositeBlockObjectRegistry } from '@/game/entities/registries/CompositeBlockObjectRegistry';

export class CompositeBlockObjectUpdateSystem {
  constructor(
    private readonly registry: CompositeBlockObjectRegistry<CompositeBlockObject>
  ) {}

  /**
   * Call this once per frame to advance simulation of all registered composite block objects.
   */
  public update(dt: number): void {
    for (const obj of this.registry.getAll()) {
      obj.update(dt);
    }
  }
}
