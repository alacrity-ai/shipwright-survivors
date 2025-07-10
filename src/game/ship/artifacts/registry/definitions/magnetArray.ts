// src/game/ship/artifacts/registry/definitions/magnetArray.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const magnetArray: ArtifactDefinition = {
  id: 'magnet-array',
  name: 'Magnet Array',
  description: 'Slight attraction <yellow>Pickup Radius</yellow> increase.',
  icon: 'icon-magnet-array',
  cost: 300,
  rarity: 'common',
  metadata: {
    pickupAttractionRangeIncrease: 200, // 200 unit radius
  },
};
