// src/game/ship/artifacts/registry/definitions/eidolonFrame.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const eidolonFrame: ArtifactDefinition = {
  id: 'eidolon-frame',
  name: 'Eidolon Frame',
  description: 'Every 30s, a weak copy of your ship spawns as an escort for 10s.',
  icon: 'icon-eidolon-frame',
  cost: 600,
  rarity: 'legendary',
  metadata: {
    summonEidolonInterval: 30,   // Time between summons (seconds)
    summonEidolonDuration: 10,   // Lifetime of the eidolon escort (seconds)
  },
};
