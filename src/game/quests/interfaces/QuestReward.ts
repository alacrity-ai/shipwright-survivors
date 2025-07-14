import type { AbilityKey } from "@/game/player/registry/AbilityRegistry";

// ──────────────────────────────────────────────────────────────
//  @/game/quests/interfaces/QuestReward.ts
//  • Granular, discriminated-union representation of quest rewards.
//  • Extend with additional variants as new reward categories emerge.
// ──────────────────────────────────────────────────────────────

/**
 * Canonical enumeration of supported quest-reward modalities.
 * Use a literal-union (not an enum) so that exhaustiveness checks
 * work seamlessly with discriminated unions.
 */
export type QuestRewardKind =
  | 'core'           // Meta-currency (e.g., Entropium cores)
  | 'shipUnlock'     // Permanently unlocks a ship blueprint
  | 'abilityUnlock'  // Grants an ability via PlayerAbilityManager
  // — append future kinds here — ;

/**
 * Common structural denominator for all reward variants.
 */
interface QuestRewardBase<Kind extends QuestRewardKind> {
  /** Discriminator enabling exhaustive switch-case logic. */
  kind: Kind;
  /** Human-readable summary used in UI tooltip copy. */
  blurb: string;
}

/** Meta-currency reward (e.g., 100 cores). */
export interface CoreReward extends QuestRewardBase<'core'> {
  amount: number;       // positive integer
}

/** Unlocks a ship by blueprint identifier. */
export interface ShipUnlockReward extends QuestRewardBase<'shipUnlock'> {
  shipId: string;       // must correspond to CollectableShipRegistry key
}

/** Unlocks an ability by registry key. */
export interface AbilityUnlockReward extends QuestRewardBase<'abilityUnlock'> {
  abilityId: AbilityKey;  // re-use key type from AbilityRegistry
}

/**
 * Exhaustive union of all reward archetypes.
 * Narrowing on `kind` gives exact property sets.
 */
export type QuestReward =
  | CoreReward
  | ShipUnlockReward
  | AbilityUnlockReward;
