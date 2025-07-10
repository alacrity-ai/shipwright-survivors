// src/game/ship/artifacts/registry/definitions/pulseVane.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const pulseVane: ArtifactDefinition = {
  id: 'pulse-vane',
  name: 'Pulse Vane',
  description: 'Emit radial knockback pulse every <cyan>10</cyan> seconds.',
  icon: 'icon-pulse-vane',
  cost: 400,
  rarity: 'rare',
  metadata: {
    radialKnockbackPulseInterval: 10, // seconds between pulses
  },
};
