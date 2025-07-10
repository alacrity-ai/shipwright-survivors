// src/game/ship/artifacts/registry/definitions/acidicRounds.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const acidicRounds: ArtifactDefinition = {
  id: 'acidic-rounds',
  name: 'Acidic Rounds',
  description: 'All damage is deferred over 5s, but deals 50% more total.',
  icon: 'icon-acidic-rounds',
  cost: 600,
  rarity: 'epic',
  metadata: {
    convertDamageToOverTime: true,
  },
};
