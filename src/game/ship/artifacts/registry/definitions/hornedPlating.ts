// src/game/ship/artifacts/registry/definitions/hornedPlating.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const hornedPlating: ArtifactDefinition = {
  id: 'horned-plating',
  name: 'Horned Plating',
  description: 'Greatly reduced <yellow>Collision Damage</yellow> taken.',
  icon: 'icon-horned-plating',
  cost: 300,
  rarity: 'uncommon',
  metadata: {
    collisionDamageMitigationMultiplier: 0.5,
  },
};
