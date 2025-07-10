// src/game/ship/artifacts/registry/definitions/rallyingDish.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const rallyingDish: ArtifactDefinition = {
  id: 'rallying-dish',
  name: 'Rallying Dish',
  description: '<yellow>Escorts</yellow> become more aggressive.',
  icon: 'icon-rallying-dish',
  cost: 300,
  rarity: 'epic',
  metadata: {
    escortDamageMultiplier: 0.50,
    escortSpeedMultiplier: 0.50,
  },
};
