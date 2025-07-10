// src/game/ship/artifacts/registry/definitions/homingBeacon.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const homingBeacon: ArtifactDefinition = {
  id: 'homing-beacon',
  name: 'Homing Beacon',
  description: 'Chance to summon <red>The Severant</red>.',
  icon: 'icon-homing-beacon',
  cost: 500,
  rarity: 'legendary',
  metadata: {
    optionalBossSummonChance: 0.10, // 10% chance per interval or trigger
  },
};
