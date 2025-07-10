// src/game/ship/artifacts/registry/definitions/ashenDrive.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const ashenDrive: ArtifactDefinition = {
  id: 'ashen-drive',
  name: 'Ashen Drive',
  description: 'Damage scales with <green>Mass</green>, up to <cyan>20%</cyan>.',
  icon: 'icon-ashen-drive',
  cost: 450,
  rarity: 'uncommon',
  metadata: {
    damageScalingWithMass: true,
  },
};
