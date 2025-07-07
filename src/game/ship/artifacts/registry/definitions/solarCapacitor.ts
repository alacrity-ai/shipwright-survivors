// src/game/ship/artifacts/registry/definitions/unstableThruster.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const solarCapacitor: ArtifactDefinition = {
  id: 'solar-capacitor',
  name: 'Solar Capacitor',
  description: 'Radiate heavy solar damage outward after taking enough hits.',
  icon: 'icon-solar-capacitor',
  cost: 300,
  rarity: 'legendary',
  metadata: {
    solarCapacitorSpecial: true,
  },
};
