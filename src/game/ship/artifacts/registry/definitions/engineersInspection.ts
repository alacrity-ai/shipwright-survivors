// src/game/ship/artifacts/registry/definitions/engineersInspection.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const engineersInspection: ArtifactDefinition = {
  id: 'engineers-inspection',
  name: "Engineer's Inspection",
  description: 'Blocks have a 5% more durability.',
  icon: 'icon-engineers-inspection',
  cost: 300,
  rarity: 'common',
  metadata: {
    blockDurabilityMultiplier: 0.05,
  },
};
