// src/game/ship/artifacts/registry/definitions/huntersCore.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const huntersCore: ArtifactDefinition = {
  id: 'hunters-core',
  name: "Hunter's Core",
  description: 'Gain haste for 3s after destroying an enemy.',
  icon: 'icon-hunters-core',
  cost: 400,
  rarity: 'legendary',
  metadata: {
    onKillHasteDuration: 3, // in seconds
  },
};
