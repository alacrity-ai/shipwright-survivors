// src/game/ship/artifacts/registry/definitions/unstableThruster.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const unstableThruster: ArtifactDefinition = {
  id: 'unstable-thruster',
  name: 'Unstable Thruster',
  description: 'Overcharges your main thruster to always Super Pulse.',
  icon: 'icon-unstable-thruster',
  cost: 300,
  rarity: 'rare',
  metadata: {
    alwaysSuperPulse: true,
  },
};
