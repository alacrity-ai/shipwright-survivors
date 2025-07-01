// src/game/tradepost/interfaces/TradePostInstance.ts

import type { TradePostItemEntry, TradePost } from './TradePost';
import type { PurchaseableItem } from './PurchaseableItem';

export interface TradePostInstance {
  id: string;

  /** Returns remaining quantity for the given index. */
  getRemainingQuantity(index: number): number;

  /** Checks if the item at the given index can be afforded with current PlayerResources. */
  canAfford(index: number): boolean;

  /** Attempts to execute a purchase. Returns true on success. */
  executeTransaction(index: number): boolean;

  /** Gets all entries that are currently purchasable. */
  getAvailableItems(): { entry: TradePostItemEntry; index: number }[];

  /** Full readonly list of entries. */
  getAllEntries(): TradePostItemEntry[];

  /** Internal accessor (e.g., for rendering) */
  getOriginalDefinition(): TradePost;
}
