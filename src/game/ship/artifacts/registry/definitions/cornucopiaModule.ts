// src/game/ship/artifacts/registry/definitions/cornucopiaModule.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const cornucopiaModule: ArtifactDefinition = {
  id: 'cornucopia-module',
  name: 'Cornucopia Module',
  description: '<cyan>+25%</cyan> block drop rate, <red>-50%</red> entropium drop rate.',
  icon: 'icon-cornucopia-module',
  cost: 400,
  rarity: 'rare',
  metadata: {
    blockDropRateBonus: 0.25,       // +25% block drop chance
    entropiumPickupBonus: -0.5,     // -50% entropium yield
  },
};
