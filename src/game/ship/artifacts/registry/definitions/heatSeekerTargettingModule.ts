// src/game/ship/artifacts/registry/definitions/heatSeekerTargettingModule.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const heatSeekerTargettingModule: ArtifactDefinition = {
  id: 'heatseeker-targeting-module',
  name: 'Seeker Targeting Module',
  description: 'Modifies seeker missiles to always aim at the nearest target.',
  icon: 'icon-heatseeker-targeting-module',
  cost: 250,
  rarity: 'rare',
  metadata: {
    heatSeekersTargetNearest: true,
  },
};
