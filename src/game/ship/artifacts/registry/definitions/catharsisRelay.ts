// src/game/ship/artifacts/registry/definitions/catharsisRelay.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const catharsisRelay: ArtifactDefinition = {
  id: 'catharsis-relay',
  name: 'Catharsis Relay',
  description: '<green>Status Effects</green> you suffer are mirrored to all nearby enemies.',
  icon: 'icon-catharsis-relay',
  cost: 500,
  rarity: 'epic',
  metadata: {
    reflectStatusEffectsToEnemies: true,
  },
};
