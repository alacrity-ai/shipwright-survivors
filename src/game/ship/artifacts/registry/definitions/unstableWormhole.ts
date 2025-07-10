// src/game/ship/artifacts/registry/definitions/unstableWormhole.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const unstableWormhole: ArtifactDefinition = {
  id: 'unstable-wormhole',
  name: 'Unstable Wormhole',
  description: 'Every 20s, a random block is added to your ship.',
  icon: 'icon-unstable-wormhole',
  cost: 450,
  rarity: 'legendary',
  metadata: {
    spawnRandomBlockInterval: 20, // in seconds
  },
};
