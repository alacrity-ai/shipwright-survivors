// src/game/ship/artifacts/registry/definitions/coatedPlating.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const coatedPlating: ArtifactDefinition = {
  id: 'coated-plating',
  name: 'Coated Plating',
  description: '<green>Status Effects</green> are halved on you, but you cannot inflict them.',
  icon: 'icon-coated-plating',
  cost: 350,
  rarity: 'rare',
  metadata: {
    statusEffectOnSelfDurationMultiplier: -0.5, // Incoming status effects last half as long
    disableStatusInfliction: true,                      // Prevents applying status effects to enemies
  },
};
