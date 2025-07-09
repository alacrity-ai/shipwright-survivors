// src/game/tradepost/interfaces/TradePostInstance.ts

import type { TradePostItemEntry, TradePost } from './TradePost';

/**
 * Runtime-bound instance of a tradepost.
 * 
 * Note:
 * - On creation, a subset of entries is selected using `appearanceChance` weights.
 * - Methods below operate only on the selected visible subset.
 */
export interface TradePostInstance {
  id: string;

  /** Returns remaining quantity for the given index (in the *visible* item list). */
  getRemainingQuantity(index: number): number;

  /** Checks if the item at the given index can be afforded with current PlayerResources. */
  canAfford(index: number): boolean;

  /** Attempts to execute a purchase. Returns true on success. */
  executeTransaction(index: number): boolean;

  /** Gets all entries that are currently purchasable (visible + affordable). */
  getAvailableItems(): { entry: TradePostItemEntry; index: number }[];

  /** Full readonly list of currently visible entries (after appearanceChance filtering). */
  getAllEntries(): TradePostItemEntry[];

  /** Reference to the original static tradepost definition (unfiltered). */
  getOriginalDefinition(): TradePost;
}
