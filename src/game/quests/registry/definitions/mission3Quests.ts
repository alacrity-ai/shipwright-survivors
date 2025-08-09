// src/game/quests/registry/definitions/mission3Quests.ts

// ──────────────────────────────────────────────────────────────
//  Mission 3 – Prexus System Quests
// ──────────────────────────────────────────────────────────────

import type { Quest } from '@/game/quests/interfaces/Quest';

export const mission3Quests: Record<string, Quest> = {
  'boss:defeatAlphaCruiser': {
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
