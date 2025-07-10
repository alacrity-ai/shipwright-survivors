// src/game/ship/artifacts/registry/definitions/echoChamber.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const echoChamber: ArtifactDefinition = {
  id: 'echo-chamber',
  name: 'Echo Chamber',
  description: '<green>Status Effects</green> you apply last <cyan>50%</cyan> longer.',
  icon: 'icon-echo-chamber',
  cost: 400,
  rarity: 'common',
  metadata: {
    inflictedStatusDurationMultiplier: 0.5,
  },
};
