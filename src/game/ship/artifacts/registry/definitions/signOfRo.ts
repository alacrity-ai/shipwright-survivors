// src/game/ship/artifacts/registry/definitions/signOfRo.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const signOfRo: ArtifactDefinition = {
  id: 'sign-of-ro',
  name: 'Sign of Ro',
  description: 'Take more damage and deal less; <red>Marked By Fate</red>.',
  icon: 'icon-sign-of-ro',
  cost: 0,
  rarity: 'legendary',
  metadata: {
    incomingDamageMultiplier: 0.25,
    outgoingDamageMultiplier: -0.25,
    markedByFate: true, // Hidden mechanic trigger
  },
};
