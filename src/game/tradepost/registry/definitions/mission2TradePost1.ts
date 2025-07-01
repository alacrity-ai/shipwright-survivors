// src/game/tradepost/registry/definitions/mission2TradePost1.ts

import type { TradePost } from '@/game/tradepost/interfaces/TradePost';

export const mission2TradePost1: TradePost = {
  id: 'mission2-tradepost-1',
  items: [
    {
      item: {
        type: 'block',
        id: 'engine3',
        wants: ['engine1', 'engine1', 'engine1']
      },
      quantity: 3
    }
  ]
};
