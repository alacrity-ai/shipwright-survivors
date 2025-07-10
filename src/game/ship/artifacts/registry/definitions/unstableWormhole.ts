// src/game/ship/artifacts/registry/definitions/unstableWormhole.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const unstableWormhole: ArtifactDefinition = {
  id: 'unstable-wormhole',
  name: 'Unstable Wormhole',
  description: 'Every <cyan>20s</cyan>, a random block is added to your ship.',
  icon: 'icon-unstable-wormhole',
  cost: 450,
  rarity: 'legendary',
  metadata: {
    spawnRandomBlockInterval: 20, // in seconds
  },
};
