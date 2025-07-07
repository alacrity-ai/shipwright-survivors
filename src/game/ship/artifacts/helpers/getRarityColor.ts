// src/game/ship/artifacts/helpers/getRarityColor.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export function getRarityColor(rarity: ArtifactDefinition['rarity']): string {
  switch (rarity) {
    case 'common': return '#bbbbbb';
    case 'rare': return '#4faaff';
    case 'epic': return '#bb66ff';
    case 'legendary': return '#ffaa33';
    default: return '#ffffff';
  }
}
