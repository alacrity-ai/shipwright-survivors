// src/game/ship/artifacts/registry/definitions/fortificationModule.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const fortificationModule: ArtifactDefinition = {
  id: 'fortification-module',
  name: 'Fortification Module',
  description: 'Increases maximum cockpit armor.',
  icon: 'icon-fortification',
  cost: 500,
  rarity: 'common',
  metadata: {
    cockpitArmorBonus: 25,
  },
};
