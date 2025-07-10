// src/game/ship/artifacts/registry/definitions/imprinterNode.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const imprinterNode: ArtifactDefinition = {
  id: 'imprinter-node',
  name: 'Imprinter Node',
  description: 'First block placed becomes imprinted; 20% of future drops match it.',
  icon: 'icon-imprinter-node',
  cost: 450,
  rarity: 'epic',
  metadata: {
    imprintFirstPlacedBlock: true,
    imprintDropBias: 0.2, // 20% chance to bias future drops toward imprinted block
  },
};
