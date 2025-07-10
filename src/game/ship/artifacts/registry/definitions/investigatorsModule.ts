// src/game/ship/artifacts/registry/definitions/investigatorsModule.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const investigatorsModule: ArtifactDefinition = {
  id: 'investigators-module',
  name: 'Investigator’s Module',
  description: 'More incidents appear; you deal more damage to incident enemies.',
  icon: 'icon-investigators-module',
  cost: 400,
  rarity: 'epic',
  metadata: {
    incidentSpawnRateMultiplier: 0.5,         // Increases frequency of incident spawns
    incidentDamageMultiplier: 0.25,           // Damage multiplier vs. incident-tagged enemies
  },
};
