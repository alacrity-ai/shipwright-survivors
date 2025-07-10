// src/game/ship/artifacts/registry/definitions/chaosModule.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const chaosModule: ArtifactDefinition = {
  id: 'chaos-module',
  name: 'Chaos Module',
  description: '<yellow>Rolling</yellow> yields higher-tier blocks more often.',
  icon: 'icon-chaos-module',
  cost: 400,
  rarity: 'uncommon',
  metadata: {
    blockGamblingUpgradeBias: 1, // +1 tier bias when rolling blocks via gambling
  },
};
