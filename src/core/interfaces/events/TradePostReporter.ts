// src/core/interfaces/events/TradePostReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function openTradepostMenu(tradePostId: string): void {
  GlobalEventBus.emit('tradepost:open', { tradePostId });
}
