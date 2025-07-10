// src/game/ship/artifacts/registry/definitions/chromaticReactor.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const chromaticReactor: ArtifactDefinition = {
  id: 'chromatic-reactor',
  name: 'Chromatic Reactor',
  description: 'Every <cyan>30s</cyan>, a random block in your queue upgrades a tier.',
  icon: 'icon-chromatic-reactor',
  cost: 500,
  rarity: 'epic',
  metadata: {
    blockQueueUpgradeInterval: 30, // seconds
  },
};
