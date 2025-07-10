// src/game/ship/artifacts/registry/definitions/hornedPlating.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const hornedPlating: ArtifactDefinition = {
  id: 'horned-plating',
  name: 'Horned Plating',
  description: 'Greatly reduced collision damage taken.',
  icon: 'icon-horned-plating',
  cost: 300,
  rarity: 'rare',
  metadata: {
    collisionDamageMitigationMultiplier: 0.5,
  },
};
