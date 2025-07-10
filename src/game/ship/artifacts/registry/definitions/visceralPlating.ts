// src/game/ship/artifacts/registry/definitions/visceralPlating.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const visceralPlating: ArtifactDefinition = {
  id: 'visceral-plating',
  name: 'Visceral Plating',
  description: 'Deal more damage. Take more damage.',
  icon: 'icon-visceral-plating',
  cost: 300,
  rarity: 'legendary',
  metadata: {
    outgoingDamageMultiplier: 0.50,
    incomingDamageMultiplier: 0.50,
  },
};
