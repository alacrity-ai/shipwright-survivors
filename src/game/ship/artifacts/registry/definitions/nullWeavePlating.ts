// src/game/ship/artifacts/registry/definitions/nullWeavePlating.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const nullWeavePlating: ArtifactDefinition = {
  id: 'null-weave-plating',
  name: 'Null Weave Plating',
  description: 'Chance for a block to survive when it would otherwise be destroyed.',
  icon: 'icon-null-weave-plating',
  cost: 500,
  rarity: 'rare',
  metadata: {
    blockSurvivalChance: 0.25,
  },
};
