// src/game/tradepost/interfaces/TradePost.ts

import type { PurchaseableItem } from './PurchaseableItem';

export interface TradePostItemEntry {
  item: PurchaseableItem;
  quantity: number; // Quantity in stock
}

// Defines a static, immutable tradepost definition
export interface TradePost {
  id: string;
  items: TradePostItemEntry[];
  metaData?: Record<string, unknown>;
}
