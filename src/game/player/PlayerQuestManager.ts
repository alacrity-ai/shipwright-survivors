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
import { PlayerArtifactsManager } from './PlayerArtifactsManager';

import { missionRegistry } from '../missions/MissionRegistry';
import { PlanetRegistry } from '../planets/PlanetRegistry';

import type { Quest }           from '@/game/quests/interfaces/Quest';
import type { QuestReward }     from '@/game/quests/interfaces/QuestReward';
import type { QuestStep, QuestStepId }  from '@/game/quests/interfaces/QuestStep';
import type { Aggregation } from '@/game/quests/interfaces/QuestStep';

import { aggregators } from '@/game/quests/interfaces/QuestStep';

export class PlayerQuestManager {
  private static instance: PlayerQuestManager;
  
  private static readonly ACTIVE_QUEST_CAP = 3;

  /** Quest identifiers the player has irrevocably completed. */
  private completed: Set<string> = new Set();
  /** Quest identifiers the player has accepted but not yet completed. */
  private active: Set<string> = new Set();

   /**
   * Mutable runtime progress store keyed by QuestStep.kind.
   *   number  ➜ cumulative tally (incremented)
   *   boolean ➜ logical OR (once true, stays true)
   *   string  ➜ last string written (e.g., boss id)
   */
  private stepProgress: Record<string, number | boolean | string> = {};

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
   * Returns the quests the player can currently *see*.
   *
   * Behaviour matrix:
   * ┌──────────────┬──────────────────────────────────────────────────┐
   * │ planetName   │ Result                                           │
   * ├──────────────┼──────────────────────────────────────────────────┤
   * │ undefined    │ All visible quests (pre-existing behaviour)      │
   * │ valid name   │ Visible quests whose ids are listed on that      │
   * │              │ planet’s `questIds` array (empty if none).       │
   * └──────────────┴──────────────────────────────────────────────────┘
   *
   * Visibility predicates (all must hold):
   *   • meets flag prerequisites
   *   • prerequisiteQuestId satisfied
   *   • quest id is in the target planet’s questIds (if planetName given)
   */
  public getVisibleQuests(planetName?: string): Quest[] {
    // If planet-scoped, obtain the authorised id set up-front.
    const planetQuestIds: Set<string> | null = planetName
      ? new Set(PlanetRegistry.getPlanetByName(planetName).questIds ?? [])
      : null;

    return Object.values(QuestRegistry).filter(q =>
      this.meetsFlagRequirements(q) &&
      !this.hasCompleted(q.id) &&
      this.prerequisiteSatisfied(q) &&
      (planetQuestIds === null || planetQuestIds.has(q.id))
    );
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
    this.active.delete(id); 
    this.grantRewards(quest.rewards);
  }

  /* ─────────────────────────── Active-Quest Tracking ─────────────────────────── */

  /** Returns `true` iff another quest can be slotted given the cap. */
  public canAddActiveQuest(): boolean {
    return this.active.size < PlayerQuestManager.ACTIVE_QUEST_CAP;
  }

  /**
   * Attempts to slot the quest as active.
   * • Returns `true` on success, `false` if cap reached or quest invalid.
   * • Ignores requests for quests already completed or already active.
   */
  public addActiveQuest(id: string): boolean {
    if (
      !QuestRegistry[id]              ||   // unknown quest
      this.completed.has(id)          ||   // already finished
      this.active.has(id)             ||   // already active
      !this.canAddActiveQuest()           // cap reached
    ) {
      return false;
    }

    this.active.add(id);
    return true;
  }

  /** Unsafely unslots a quest (no-op if not active). */
  public removeActiveQuest(id: string): void {
    this.active.delete(id);
  }

  /** Convenience getter for UI menus etc. */
  public getActiveQuests(): readonly string[] {
    return Array.from(this.active);
  }

  /**
   * Records step advancement.
   *   • Combination semantics are dictated by the step’s `aggregation`.
   *   • If absent, legacy heuristics are applied (add/or/replace).
   * Returns true iff the step was relevant and state mutated.
   */
  public updateStep(
    stepId: QuestStepId,
    value: number | boolean | string
  ): boolean {
    // ── 1. Determine whether any ACTIVE quest references this step ──────────
    let stepDefinition: QuestStep | undefined;

    for (const qid of this.active) {
      const quest = QuestRegistry[qid];
      if (!quest) continue;
      stepDefinition = quest.steps.find(s => s.kind === stepId);
      if (stepDefinition) break; // found the first relevant quest/step
    }

    if (!stepDefinition) return false;          // irrelevant to current quests

    // ── 2. Resolve aggregation strategy ─────────────────────────────────────
    const policy: Aggregation =
      stepDefinition.aggregation ??
      (typeof value === 'number'
        ? 'add'
        : typeof value === 'boolean'
        ? 'or'
        : 'replace');

    // ── 3. Combine using the centralised dispatcher ─────────────────────────
    const prev = this.stepProgress[stepId];
    const next = aggregators[policy](prev, value);

    // Short‑circuit if nothing changed (cheap guard for booleans / sets)
    if (prev === next) return false;

    this.stepProgress[stepId] = next;
    return true;
  }

  /**
   * Returns active quests whose *every* QuestStep goal
   * has been met or exceeded by `stepProgress`.
   */
  public getQuestsReadyForCompletion(): Quest[] {
    const ready: Quest[] = [];

    for (const id of this.active) {
      const quest = QuestRegistry[id];
      if (!quest) continue;

      const allMet = quest.steps.every((step: QuestStep) => {
        const progress = this.stepProgress[step.kind];

        switch (typeof step.goal) {
          case 'number':
            return typeof progress === 'number' && progress >= step.goal;
          case 'boolean':
            return progress === true; // must be strict true
          case 'string':
            return progress === step.goal;
          /* istanbul ignore next */
          default:
            return false;
        }
      });

      if (allMet) ready.push(quest);
    }

    return ready;
  }

  /* ─────────────────────────── Mission Helpers ─────────────────────────── */

  /**
   * Counts every quest linked to the given mission, irrespective of visibility or
   * completion status.  Duplicates (the same quest id on multiple planets) are
   * collapsed to one.
   */
  public getTotalQuestsInMission(missionId: string): number {
    const mission = missionRegistry[missionId];
    if (!mission) {
      console.warn(`[PlayerQuestManager] Unknown mission id: ${missionId}`);
      return 0;
    }

    const questIds = new Set<string>();

    for (const { name: planetName } of mission.planets ?? []) {
      try {
        const planet = PlanetRegistry.getPlanetByName(planetName);
        (planet.questIds ?? []).forEach(id => questIds.add(id));
      } catch {
        console.warn(
          `[PlayerQuestManager] Mission "${missionId}" references missing planet "${planetName}".`
        );
      }
    }

    return questIds.size;
  }

  /**
   * Counts how many of the mission’s quests the player has completed.
   * Duplicate quest ids across planets are counted once.
   */
  public getCompletedQuestsInMission(missionId: string): number {
    const mission = missionRegistry[missionId];
    if (!mission) {
      console.warn(`[PlayerQuestManager] Unknown mission id: ${missionId}`);
      return 0;
    }

    let completedCount = 0;
    const seen = new Set<string>();

    for (const { name: planetName } of mission.planets ?? []) {
      try {
        const planet = PlanetRegistry.getPlanetByName(planetName);
        for (const id of planet.questIds ?? []) {
          if (!seen.has(id)) {
            seen.add(id);
            if (this.completed.has(id)) completedCount++;
          }
        }
      } catch {
        console.warn(
          `[PlayerQuestManager] Mission "${missionId}" references missing planet "${planetName}".`
        );
      }
    }

    return completedCount;
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

  /* ────────────────────────── Helpers ────────────────────────── */

  /** True iff the quest’s prerequisiteQuestId (if any) has been completed. */
  private prerequisiteSatisfied(q: Quest): boolean {
    const { prerequisiteQuestId } = q;
    return !prerequisiteQuestId || this.completed.has(prerequisiteQuestId);
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
        
        case 'artifactUnlock':
          PlayerArtifactsManager.getInstance().unlockArtifact(r.artifactId);
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

  // ─────────────────────── Debugging ───────────────────────

  public clearActiveQuests(): void {
    this.active.clear();
  }

  /** Purges all quest progression (dev / debug only). */
  public reset(): void {
    this.completed.clear();
    this.active.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Global façade (parallels `abilities`, `flags`, etc.)
// ─────────────────────────────────────────────────────────────────────
export const quests = PlayerQuestManager.getInstance();
