// src/game/quests/registry/definitions/mission5Quests.ts

// ──────────────────────────────────────────────────────────────
//  Mission 5 – Solarum System Quests
// ──────────────────────────────────────────────────────────────

import type { Quest } from '@/game/quests/interfaces/Quest';

export const mission5Quests: Record<string, Quest> = {
  'boss:defeatAlphaCruiser4': {
    id          : 'boss:defeatAlphaCruiser2',
    name        : 'Alpha Cruiser Vanquished',
    icon        : 'quest_alpha_cruiser',
    description : 'Defeat the Alpha Cruiser to secure safe passage through sector Δ-17.',
    steps       : [
      {
        kind     : 'bossSlain',
        progress : '',
        goal     : 'alphaCruiser',
      },
    ],
    rewards     : [
      {
        kind  : 'shipUnlock',
        blurb : 'Unlocks the “Aegis” heavy frigate',
        shipId: 'aegisFrigate',
      },
      { kind: 'core', blurb: '+250 Cores', amount: 250 },
    ],
  },
};
