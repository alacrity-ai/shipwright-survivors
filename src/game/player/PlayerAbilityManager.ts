// src/game/player/PlayerAbilityManager.ts
import type { AbilityKey } from '@/game/player/registry/AbilityRegistry';
import { getAbility }      from '@/game/player/registry/AbilityRegistry';

import { AbilityRegistry } from '@/game/player/registry/AbilityRegistry';
import { updateBlockQueueAbilities } from '@/core/interfaces/events/AbilityReporter';

/**
 * Tracks which abilities the active player profile has unlocked.
 * Serializable, resettable, and symmetrical with PlayerFlagManager et al.
 */
export class PlayerAbilityManager {
  private static instance: PlayerAbilityManager;
  /** Normalised set of unlocked ability keys. */
  private unlocked: Set<AbilityKey> = new Set();

  private constructor() {/*   intentionally empty   */}

  // ─────────────────────────── Singleton ────────────────────────────
  public static getInstance(): PlayerAbilityManager {
    if (!PlayerAbilityManager.instance) {
      PlayerAbilityManager.instance = new PlayerAbilityManager();
    }
    return PlayerAbilityManager.instance;
  }

  // ──────────────────────────── API: state ──────────────────────────
  public unlock(key: AbilityKey): void {
    this.unlocked.add(key);
    updateBlockQueueAbilities();
  }

  public revoke(key: AbilityKey): void {
    this.unlocked.delete(key);
    updateBlockQueueAbilities();
  }

  /** Predicate suitable for UI feature-gating. */
  public has(key: AbilityKey): boolean {
    return this.unlocked.has(key);
  }

  public clear(): void {
    this.unlocked.clear();
    updateBlockQueueAbilities();
  }

  /** Returns *definitions* (rich objects) for all unlocked abilities. */
  public list(): ReturnType<typeof getAbility>[] {
    return Array.from(this.unlocked).map(getAbility);
  }

  // ──────────────────────── Persistence layer ──────────────────────
  public toJSON(): string {
    return JSON.stringify([...this.unlocked]);
  }

  public fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        /* Sanitize: include only recognised ability keys. */
        const valid = parsed.filter((k): k is AbilityKey => {
          try { getAbility(k as AbilityKey); return true; } catch { return false; }
        });
        this.unlocked = new Set(valid);
      }
    } catch (err) {
      console.warn('[PlayerAbilityManager] Failed to parse save data:', err);
    }
  }

  public reset(): void {
    this.unlocked.clear();
  }

  // ──────────────────────────── Debug helpers ──────────────────────────
  /**
   * Permanently adds every ability enumerated in {@link AbilityRegistry} to the
   * unlocked set. Intended exclusively for diagnostic / sandbox scenarios.
   *
   * Invoke from the dev console:
   *     abilities.unlockAll();
   *
   * NOTE: This method is compiled only when NODE_ENV !== 'production'.  In
   * production bundles the reference is replaced with a no-op to guarantee
   * players cannot surreptitiously unlock content.
   */
  public unlockAll(): void {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    (Object.keys(AbilityRegistry) as AbilityKey[]).forEach(k => this.unlocked.add(k));
    updateBlockQueueAbilities();
  }
}

/* Global façade – mirrors pattern used elsewhere. */
export const abilities = PlayerAbilityManager.getInstance();
