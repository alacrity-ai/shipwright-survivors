// src/game/tradepost/registry/definitions/mission2TradePost0.ts

import type { TradePost } from '@/game/tradepost/interfaces/TradePost';

export const mission2TradePost0: TradePost = {
  id: 'mission2-tradepost-0',
  items: [
    {
      item: {
        type: 'ship',
        id: 'monarch',
        wants: ['explosiveLance2', 'explosiveLance2', 'explosiveLance2']
      },
      quantity: 1
    },
    {
      item: {
        type: 'block',
        id: 'engine2',
        wants: ['turret1', 'turret1']
      },
      quantity: 5
    },
    {
      item: {
        type: 'block',
        id: 'engine3',
        wants: ['turret2', 'turret2']
      },
      quantity: 5
    }
  ]
};
