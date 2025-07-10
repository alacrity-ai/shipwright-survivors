// src/game/ship/artifacts/registry/definitions/midasApparatus.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const midasApparatus: ArtifactDefinition = {
  id: 'midas-apparatus',
  name: 'Midas Apparatus',
  description: 'Placed blocks are converted into <yellow>Entropium</yellow>.',
  icon: 'icon-midas-apparatus',
  cost: 500,
  rarity: 'epic',
  metadata: {
    convertPlacedBlocksToEntropium: true,
  },
};
