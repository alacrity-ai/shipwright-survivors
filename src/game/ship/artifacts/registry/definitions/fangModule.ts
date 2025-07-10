// src/game/ship/artifacts/registry/definitions/fangModule.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const fangModule: ArtifactDefinition = {
  id: 'fang-module',
  name: 'Fang Module',
  description: 'Blocks slowly degrade; you gain 10% base lifesteal.',
  icon: 'icon-fang-module',
  cost: 450,
  rarity: 'rare',
  metadata: {
    blockDecayRate: 1,           // HP lost per second per block
    baseLifestealPercentage: 0.10, // 10% of damage dealt is returned as health
  },
};
