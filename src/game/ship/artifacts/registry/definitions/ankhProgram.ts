// src/game/ship/artifacts/registry/definitions/ankhProgram.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const ankhProgram: ArtifactDefinition = {
  id: 'ankh-program',
  name: 'Ankh Program',
  description: '<yellow>Revive</yellow> once on death with half of your blocks.',
  icon: 'icon-ankh-program',
  cost: 600,
  rarity: 'epic',
  metadata: {
    reviveOnDeath: true,
    reviveBlockRetentionRatio: 0.5, // 50% of blocks retained on revive
  },
};
