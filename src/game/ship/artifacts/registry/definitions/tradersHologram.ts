// src/game/ship/artifacts/registry/definitions/tradersHologram.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const tradersHologram: ArtifactDefinition = {
  id: 'traders-hologram',
  name: "Trader's Hologram",
  description: 'Trade post prices are reduced.',
  icon: 'icon-traders-hologram',
  cost: 350,
  rarity: 'rare',
  metadata: {
    tradePostPriceReduction: 1, // Prices are multiplied by this factor
  },
};
