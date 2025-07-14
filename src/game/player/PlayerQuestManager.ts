// ─────────────────────────────────────────────────────────────────────────────
//  @/game/player/PlayerQuestManager.ts
//  • Canonical singleton responsible for quest discovery & completion state.
//  • Delegates reward fulfilment to downstream managers.
// ─────────────────────────────────────────────────────────────────────────────

import { QuestRegistry }        from '@/game/quests/registry/QuestRegistry';
import { flags }                from '@/game/player/PlayerFlagManager';
import { abilities }            from '@/game/player/PlayerAbilityManager';

import { PlayerShipCollection } from './PlayerShipCollection';
import { PlayerMetaCurrencyManager } from './PlayerMetaCurrencyManager';

import type { Quest }           from '@/game/quests/interfaces/Quest';
import type { QuestReward }     from '@/game/quests/interfaces/QuestReward';

export class PlayerQuestManager {
  private static instance: PlayerQuestManager;

  /** Quest identifiers the player has irrevocably completed. */
  private completed: Set<string> = new Set();

  private constructor() { /* intentionally empty */ }

  // ─────────────────────────── Singleton ────────────────────────────
  public static getInstance(): PlayerQuestManager {
    if (!PlayerQuestManager.instance) {
      PlayerQuestManager.instance = new PlayerQuestManager();
    }
    return PlayerQuestManager.instance;
  }

  // ─────────────────────────── Query API ────────────────────────────
  /** Returns `true` iff the quest is registered *and* completed. */
  public hasCompleted(id: string): boolean {
    return this.completed.has(id);
  }

  /**
   * Yields definitions of all quests the player can currently *see*,
   * honouring flag prerequisites but regardless of completion status.
   */
  public getVisibleQuests(): Quest[] {
    return Object.values(QuestRegistry)
      .filter(q => this.meetsFlagRequirements(q));
  }

  /** Returns quest metadata or throws if the id is unrecognised. */
  public getQuest(id: string): Quest {
    const q = QuestRegistry[id];
    if (!q) throw new Error(`[PlayerQuestManager] Unknown quest id: ${id}`);
    return q;
  }

  // ────────────────────── Mutation / Progression ────────────────────
  /**
   * Marks the quest as completed (idempotent) and dispenses rewards.
   * Emits console warnings if pre-conditions fail.
   */
  public complete(id: string): void {
    if (this.completed.has(id)) return;               // already done

    const quest = QuestRegistry[id];
    if (!quest) {
      console.warn(`[PlayerQuestManager] Tried to complete unknown quest: ${id}`);
      return;
    }

    if (!this.meetsFlagRequirements(quest)) {
      console.warn(`[PlayerQuestManager] Quest prerequisites not met: ${id}`);
      return;
    }

    this.completed.add(id);
    this.grantRewards(quest.rewards);
    // TODO: Dispatch an event → QuestCompletionReporter.emitQuestCompleted(id)
  }

  /** Purges all quest progression (dev / debug only). */
  public reset(): void {
    this.completed.clear();
  }

  // ───────────────────────── Serialization ──────────────────────────
  public toJSON(): string {
    return JSON.stringify(Array.from(this.completed));
  }

  public fromJSON(json: string): void {
    try {
      const parsed: unknown = JSON.parse(json);

      if (Array.isArray(parsed)) {
        const valid = parsed.filter(
          (id): id is string =>
            typeof id === 'string' && id in QuestRegistry
        );

        this.completed = new Set(valid);
      }
    } catch (err) {
      console.warn('[PlayerQuestManager] Failed to parse JSON:', err);
    }
  }

  // ─────────────────────── Internal Utilities ───────────────────────
  private meetsFlagRequirements(q: Quest): boolean {
    return (q.flagRequirements ?? []).every(f => flags.has(f));
  }

  private grantRewards(rewards: QuestReward[]): void {
    for (const r of rewards) {
      switch (r.kind) {
        case 'core':
          PlayerMetaCurrencyManager.getInstance().addMetaCurrency(r.amount);
          break;

        case 'shipUnlock':
          PlayerShipCollection.getInstance().unlockById(r.shipId);
          break;

        case 'abilityUnlock':
          abilities.unlock(r.abilityId);
          break;

        // Exhaustiveness check ensures compile-time safety when new kinds added
        /* istanbul ignore next */
        default:
          ((x: never) => {
            console.warn('[PlayerQuestManager] Unhandled reward kind:', x);
          })(r);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Global façade (parallels `abilities`, `flags`, etc.)
// ─────────────────────────────────────────────────────────────────────
export const quests = PlayerQuestManager.getInstance();
