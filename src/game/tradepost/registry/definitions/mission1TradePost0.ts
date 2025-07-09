// src/game/tradepost/registry/definitions/mission1TradePost0.ts

import type { TradePost } from '@/game/tradepost/interfaces/TradePost';

export const mission1TradePost0: TradePost = {
  id: 'mission1-tradepost-0',
  items: [
    // Turret block, common
    {
      item: {
        type: 'block',
        id: 'turret1',
        wants: ['hull1', 'hull1', 'hull1']
      },
      quantity: 5,
      guaranteed: true,
    },
    // Engine block, common
    {
      item: {
        type: 'block',
        id: 'engine2',
        wants: ['engine1', 'engine1']
      },
      quantity: 5,
      appearanceChance: 0.3
    },
    // Fin Block, common
    {
      item: {
        type: 'block',
        id: 'fin2',
        wants: ['fin1', 'fin1']
      },
      quantity: 5,
      appearanceChance: 0.3
    },
    // heatSeeker block, semi-rare
    {
      item: {
        type: 'block',
        id: 'heatSeeker1',
        wants: ['turret1', 'facetplate1', 'facetplate1']
      },
      quantity: 3,
      appearanceChance: 0.25
    },
    // Fortification artifact, semi-rare
    {
      item: {
        type: 'artifact',
        id: 'fortification-module',
        wants: ['facetplate2', 'hull2', 'fin2'],
      },
      quantity: 1,
      appearanceChance: 0.25
    },
    // Afterburner artifact, very rare
    {
      item: {
        type: 'artifact',
        id: 'unstable-thruster',
        wants: ['engine2', 'engine2', 'engine2'],
      },
      quantity: 1,
      appearanceChance: 0.05
    }
  ]
};
