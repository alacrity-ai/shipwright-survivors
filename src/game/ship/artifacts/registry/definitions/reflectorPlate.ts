// src/game/ship/artifacts/registry/definitions/unstableThruster.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export const reflectorPlate: ArtifactDefinition = {
  id: 'reflector-plate',
  name: 'Reflector Plate',
  description: 'Chance to reflect turret projectiles back to the attacker.',
  icon: 'icon-reflector-plate',
  cost: 300,
  rarity: 'uncommon',
  metadata: {
    chanceToReflectTurretProjectiles: 0.25,
  },
};
