// src/game/tradepost/interfaces/TradePost.ts

import type { PurchaseableItem } from './PurchaseableItem';

export interface TradePostItemEntry {
  item: PurchaseableItem;
  quantity: number; // Quantity in stock
  appearanceChance?: number; // ← optional, 1.0 by default
  guaranteed?: boolean; // ← optional, false by default
}

// Defines a static, immutable tradepost definition
export interface TradePost {
  id: string;
  items: TradePostItemEntry[];
  metaData?: {
    maxVisibleItems?: number; // ← controls truncation
    seed?: number | string;   // ← optional, for reproducibility
  };
}
