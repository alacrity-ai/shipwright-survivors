// src/game/ship/artifacts/registry/definitions/cornucopiaModule.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const cornucopiaModule: ArtifactDefinition = {
  id: 'cornucopia-module',
  name: 'Cornucopia Module',
  description: '+25% block drop rate, -50% entropium drop rate.',
  icon: 'icon-cornucopia-module',
  cost: 400,
  rarity: 'rare',
  metadata: {
    blockDropRateBonus: 0.25,       // +25% block drop chance
    entropiumPickupBonus: -0.5,     // -50% entropium yield
  },
};
