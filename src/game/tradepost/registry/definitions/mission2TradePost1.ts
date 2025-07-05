// src/game/tradepost/registry/definitions/mission2TradePost1.ts

import type { TradePost } from '@/game/tradepost/interfaces/TradePost';

export const mission2TradePost1: TradePost = {
  id: 'mission2-tradepost-1',
  items: [
    {
      item: {
        type: 'block',
        id: 'heatSeeker2',
        wants: ['hull2', 'hull2', 'hull2']
      },
      quantity: 3
    },
    {
      item: {
        type: 'block',
        id: 'explosiveLance2',
        wants: ['fin2', 'fin2', 'fin2']
      },
      quantity: 3
    },
    {
      item: {
        type: 'block',
        id: 'turret2',
        wants: ['facetplate2', 'facetplate2', 'facetplate2']
      },
      quantity: 3
    }
  ]
};
