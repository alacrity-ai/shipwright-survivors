// src/game/ship/artifacts/registry/definitions/ashenDrive.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const ashenDrive: ArtifactDefinition = {
  id: 'ashen-drive',
  name: 'Ashen Drive',
  description: 'Damage scales with mass, up to 20%',
  icon: 'icon-ashen-drive',
  cost: 450,
  rarity: 'rare',
  metadata: {
    damageScalingWithMass: true,
  },
};
