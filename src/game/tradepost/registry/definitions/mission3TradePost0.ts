// src/game/tradepost/registry/definitions/mission3TradePost0.ts

import type { TradePost } from '@/game/tradepost/interfaces/TradePost';


export const mission3TradePost0: TradePost = {
  id: 'mission3-tradepost-0',
  items: [
    {
      item: {
        type: 'ship',
        id: 'halo',
        wants: ['haloBlade1', 'haloBlade1', 'haloBlade1']
      },
      quantity: 1
    },
    {
      item: {
        type: 'block',
        id: 'facetplate2',
        wants: ['hull1', 'hull1']
      },
      quantity: 5
    },
    {
      item: {
        type: 'block',
        id: 'engine2',
        wants: ['hull1', 'hull1', 'hull1']
      },
      quantity: 5
    }
  ]
};
