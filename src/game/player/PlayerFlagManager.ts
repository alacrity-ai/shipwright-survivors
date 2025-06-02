// src/game/player/PlayerFlagManager.ts

/*
Use a hierarchical dot-separated format for clarity and queryability:

"scene.subcontext.intent"
e.g.
"breakroom.marlaGreeting.seen"
"hub.intro.complete"
"boss.asterion.defeated"
*/

export class PlayerFlagManager {
  private flags: Set<string> = new Set();

  // === Lifecycle ===

  public set(flag: string): void {
    this.flags.add(flag);
  }

  public unset(flag: string): void {
    this.flags.delete(flag);
  }

  public has(flag: string): boolean {
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
        this.flags = new Set(parsed);
      }
    } catch (err) {
      console.warn('Failed to load player flags from JSON:', err);
    }
  }

  // === Debug / Utility ===

  public getAll(): string[] {
    return Array.from(this.flags);
  }
}

// === Global singleton instance ===
export const flags = new PlayerFlagManager();
