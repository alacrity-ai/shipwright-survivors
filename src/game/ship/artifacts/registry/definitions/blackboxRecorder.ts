// src/game/ship/artifacts/registry/definitions/blackboxRecorder.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const blackboxRecorder: ArtifactDefinition = {
  id: 'blackbox-recorder',
  name: 'Blackbox Recorder',
  description: 'When a block is destroyed, gain stacking +5% damage (max +25%, lasts 5s).',
  icon: 'icon-blackbox-recorder',
  cost: 500,
  rarity: 'rare',
  metadata: {
    onBlockDestroyedDamageBuff: true,
  },
};
