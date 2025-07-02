// src/game/tradepost/registry/definitions/mission2TradePost0.ts

import type { TradePost } from '@/game/tradepost/interfaces/TradePost';

export const mission2TradePost0: TradePost = {
  id: 'mission2-tradepost-0',
  items: [
    {
      item: {
        type: 'ship',
        id: 'monarch',
        wants: ['explosiveLance1', 'explosiveLance1', 'explosiveLance1']
      },
      quantity: 1
    }
  ]
};
