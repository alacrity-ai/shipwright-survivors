// src/game/ship/artifacts/registry/definitions/phaseglassHull.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const phaseglassHull: ArtifactDefinition = {
  id: 'phaseglass-hull',
  name: 'Phaseglass Hull',
  description: 'Gain a shield every <cyan>5s</cyan> that completely absorbs the next hit.',
  icon: 'icon-phaseglass-hull',
  cost: 500,
  rarity: 'rare',
  metadata: {
    periodicOneHitShieldInterval: 5, // seconds between shield refresh
  },
};
