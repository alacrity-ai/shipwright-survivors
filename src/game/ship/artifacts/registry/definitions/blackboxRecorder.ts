// src/game/ship/artifacts/registry/definitions/blackboxRecorder.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const blackboxRecorder: ArtifactDefinition = {
  id: 'blackbox-recorder',
  name: 'Blackbox Recorder',
  description: 'When a block is destroyed, gain stacking <cyan>+5%</cyan> damage (max <cyan>+25%</cyan>, lasts <cyan>5s</cyan>).',
  icon: 'icon-blackbox-recorder',
  cost: 500,
  rarity: 'uncommon',
  metadata: {
    onBlockDestroyedDamageBuff: true,
  },
};
