// src/game/ship/artifacts/registry/definitions/wardensGavel.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const wardensGavel: ArtifactDefinition = {
  id: 'wardens-gavel',
  name: "Warden's Gavel",
  description: 'Deal +30% damage to enemies afflicted with status effects.',
  icon: 'icon-wardens-gavel',
  cost: 400,
  rarity: 'legendary',
  metadata: {
    damageToStatusedEnemiesMultiplier: 0.3, // +30% damage vs. status-affected enemies
  },
};
