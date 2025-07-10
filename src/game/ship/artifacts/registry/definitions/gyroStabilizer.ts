// src/game/ship/artifacts/registry/definitions/gyroStabilizer.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const gyroStabilizer: ArtifactDefinition = {
  id: 'gyro-stabilizer',
  name: 'Gyro Stabilizer',
  description: 'Slightly improves thruster speed.',
  icon: 'icon-gyro-stabilizer',
  cost: 150,
  rarity: 'common',
  metadata: {
    thrustMultiplier: 0.1,
  },
};
