// src/game/ship/artifacts/registry/definitions/spiteCoil.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const spiteCoil: ArtifactDefinition = {
  id: 'spite-coil',
  name: 'Spite Coil',
  description: 'When a block is destroyed, release shrapnel forward.',
  icon: 'icon-spite-coil',
  cost: 400,
  rarity: 'rare',
  metadata: {
    releaseShrapnelOnBlockDestruction: true,
  },
};
