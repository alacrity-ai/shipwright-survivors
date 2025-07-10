// src/game/ship/artifacts/registry/definitions/flatShells.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const flatShells: ArtifactDefinition = {
  id: 'flat-shells',
  name: 'Flat Shells',
  description: 'Cannot <purple>Critical Hit</purple>, but gain <cyan>+50%</cyan> damage.',
  icon: 'icon-flat-shells',
  cost: 300,
  rarity: 'rare',
  metadata: {
    outgoingDamageMultiplier: 0.5,
    disableCriticalHits: true,
  },
};
