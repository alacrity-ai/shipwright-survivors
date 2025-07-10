// src/game/ship/artifacts/registry/definitions/ampedScope.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const ampedScope: ArtifactDefinition = {
  id: 'amped-scope',
  name: 'Amped Scope',
  description: 'Increased Critical Hit Chance and Critical Multiplier.',
  icon: 'icon-amped-scope',
  cost: 300,
  rarity: 'common',
  metadata: {
    criticalHitChanceBonus: 0.05,     // +5% crit chance
    criticalHitMultiplierBonus: 0.20, // +0.20× crit damage multiplier
  },
};
