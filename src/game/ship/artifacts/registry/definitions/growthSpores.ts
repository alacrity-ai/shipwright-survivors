// src/game/ship/artifacts/registry/definitions/growthSpores.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const growthSpores: ArtifactDefinition = {
  id: 'growth-spores',
  name: 'Growth Spores',
  description: 'Blocks slowly regenerate durability over time.',
  icon: 'icon-growth-spores',
  cost: 350,
  rarity: 'common',
  metadata: {
    blockHP5s: 3, // HP per 5 second regenerated passively
  },
};
