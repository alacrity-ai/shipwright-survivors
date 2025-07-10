// src/game/ship/artifacts/registry/definitions/gravestoneSignet.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const gravestoneSignet: ArtifactDefinition = {
  id: 'gravestone-signet',
  name: 'Gravestone Signet',
  description: 'Defeated enemies may respawn as <yellow>Escorts</yellow>.',
  icon: 'icon-gravestone-signet',
  cost: 500,
  rarity: 'legendary',
  metadata: {
    enemyRespawnAsEscortChance: 0.10, // 10% chance defeated enemy returns as allied escort
  },
};
