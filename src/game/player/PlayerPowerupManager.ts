// src/game/powerups/runtime/PlayerPowerupManager.ts

import { PowerupRegistry } from '@/game/powerups/registry/PowerupRegistry';

export class PlayerPowerupManager {
  private static instance: PlayerPowerupManager | null = null;
  private acquiredPowerupIds = new Set<string>();

  private constructor() {}

  public static getInstance(): PlayerPowerupManager {
    return this.instance ??= new PlayerPowerupManager();
  }

  /** Returns true if the player has acquired the given powerup node ID */
  public has(id: string): boolean {
    return this.acquiredPowerupIds.has(id);
  }

  /** Returns all acquired powerup node IDs */
  public getAll(): string[] {
    return [...this.acquiredPowerupIds];
  }

  /** Returns a Set of acquired node IDs (for fast lookup use) */
  public getAcquiredSet(): Set<string> {
    return new Set(this.acquiredPowerupIds);
  }

  /** Adds a powerup to the player’s acquired set */
  public acquire(id: string): void {
    if (!PowerupRegistry.has(id)) {
      console.warn(`[PlayerPowerupManager] Attempted to acquire unknown node: ${id}`);
      return;
    }

    this.acquiredPowerupIds.add(id);

    // TODO: emit event hook for UI updates or capstone unlock triggers
    // GlobalEventBus.emit('powerup:acquired', { id });
  }

  /** Clears all acquired powerups */
  public reset(): void {
    this.acquiredPowerupIds.clear();
  }

  /** Returns true if any powerup in the given exclusiveBranchKey has already been acquired */
  public hasExclusiveBranch(exclusiveKey: string): boolean {
    for (const id of this.acquiredPowerupIds) {
      const node = PowerupRegistry.get(id);
      if (node?.exclusiveBranchKey === exclusiveKey) return true;
    }
    return false;
  }

  /** Returns the procedural depth of a given node (e.g., +4 = depth 4) */
  public getProceduralDepth(id: string): number {
    const match = id.match(/\+(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /** Returns the number of nodes currently acquired in the given category */
  public getCountByCategory(category: string): number {
    return this.getAll().filter(id => PowerupRegistry.get(id)?.category === category).length;
  }

  /** Destroys singleton state and clears registry */
  public static destroy(): void {
    this.instance?.reset();
    this.instance = null;
    PowerupRegistry.destroy();
  }
}
