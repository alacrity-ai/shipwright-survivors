// src/game/player/PlayerFlagManager.ts

import { FlagRegistry } from '@/game/player/registry/FlagRegistry';

import type { FlagKey } from '@/game/player/registry/FlagRegistry';

export class PlayerFlagManager {
  private flags: Set<FlagKey> = new Set();

  // === Lifecycle ===

  public set(flag: FlagKey): void {
    this.flags.add(flag);
  }

  public unset(flag: FlagKey): void {
    this.flags.delete(flag);
  }

  public has(flag: FlagKey): boolean {
    return this.flags.has(flag);
  }

  public clear(): void {
    this.flags.clear();
  }

  // === Serialization ===

  public toJSON(): string {
    return JSON.stringify(Array.from(this.flags));
  }

  public fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        // Filter to only include known flags
        const validFlags = parsed.filter((f): f is FlagKey => f in FlagRegistry);
        this.flags = new Set(validFlags);
      }
    } catch (err) {
      console.warn('Failed to load player flags from JSON:', err);
    }
  }

  // === Debug / Utility ===

  public getAll(): FlagKey[] {
    return Array.from(this.flags);
  }

  public unlockAllFlags(): void {
    (Object.keys(FlagRegistry) as FlagKey[]).forEach((flag) => {
      this.flags.add(flag);
    });
  }
}

// === Global singleton instance ===
export const flags = new PlayerFlagManager();
