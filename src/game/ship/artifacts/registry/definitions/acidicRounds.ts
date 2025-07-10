// src/game/ship/artifacts/registry/definitions/acidicRounds.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const acidicRounds: ArtifactDefinition = {
  id: 'acidic-rounds',
  name: 'Acidic Rounds',
  description: 'All outgoing damage is deferred over <cyan>5s</cyan>, but deals <cyan>50%</cyan> more in total.',
  icon: 'icon-acidic-rounds',
  cost: 600,
  rarity: 'epic',
  metadata: {
    convertDamageToOverTime: true,
  },
};
