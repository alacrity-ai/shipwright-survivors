// src/game/tradepost/registry/definitions/mission1TradePost0.ts

import type { TradePost } from '@/game/tradepost/interfaces/TradePost';

export const mission1TradePost0: TradePost = {
  id: 'mission1-tradepost-0',
  items: [
    {
      item: {
        type: 'block',
        id: 'turret1',
        wants: ['hull1', 'hull1', 'hull1']
      },
      quantity: 5
    }
  ]
};
