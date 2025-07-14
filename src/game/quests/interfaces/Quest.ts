// ──────────────────────────────────────────────────────────────
//  @/game/quests/interfaces/Quest.ts
//  • Immutable metadata contract for a quest definition.
//  • Persisted by registry; consumed by PlayerQuestManager.
// ──────────────────────────────────────────────────────────────

import type { QuestReward } from './QuestReward';
import type { FlagKey }     from '@/game/player/registry/FlagRegistry';

/**
 * Static quest specification registered at build time.
 * Dynamically localised labels should be resolved at the UI layer,
 * not embedded here.
 */
export interface Quest {
  /** Unique, stable identifier (machine-readable). */
  id: string;

  /** Display name surfaced in quest log UI. */
  name: string;

  /**
   * Icon cache lookup key; the actual sprite is resolved lazily
   * through QuestIconCache to avoid premature texture inflation.
   */
  icon: string;

  /** Narrative or objective description shown to the player. */
  description: string;

  /**
   * Optional flag prerequisites.  The quest is considered *hidden*
   * until **every** listed flag is present in PlayerFlagManager.
   */
  flagRequirements?: FlagKey[];

  /** One or more rewards bestowed upon first completion. */
  rewards: QuestReward[];
}
