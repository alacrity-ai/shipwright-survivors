// src/game/ship/artifacts/registry/definitions/resupplyCargo.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const resupplyCargo: ArtifactDefinition = {
  id: 'resupply-cargo',
  name: 'Resupply Cargo',
  description: 'Start with a random <white>Mk I</white> <yellow>Weapon Block</yellow> in your queue.',
  icon: 'icon-resupply-cargo',
  cost: 150,
  rarity: 'uncommon',
  metadata: {
    randomStartingBlockTier1Weapon: true,
  },
};
