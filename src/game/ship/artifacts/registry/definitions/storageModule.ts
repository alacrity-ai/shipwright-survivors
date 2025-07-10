// src/game/ship/artifacts/registry/definitions/storageModule.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const storageModule: ArtifactDefinition = {
  id: 'storage-module',
  name: 'Storage Module',
  description: 'Increases block queue size.',
  icon: 'icon-storage-module',
  cost: 300,
  rarity: 'common',
  metadata: {
    maximumBlockQueueSizeIncrease: 5, // 5 more blocks
  },
};
