// src/game/ship/artifacts/registry/definitions/echoChamber.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const echoChamber: ArtifactDefinition = {
  id: 'echo-chamber',
  name: 'Echo Chamber',
  description: 'Status effects you apply last 50% longer.',
  icon: 'icon-echo-chamber',
  cost: 400,
  rarity: 'common',
  metadata: {
    inflictedStatusDurationMultiplier: 0.5,
  },
};
