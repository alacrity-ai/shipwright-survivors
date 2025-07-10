// src/game/ship/artifacts/helpers/getRarityColor.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

export function getRarityColor(rarity: ArtifactDefinition['rarity']): string {
  switch (rarity) {
    case 'common': return '#bbbbbb'; // White silver
    case 'uncommon': return '#55dd55'; // Bright green
    case 'rare': return '#4faaff'; // Cyan
    case 'epic': return '#bb66ff'; // Purple
    case 'legendary': return '#ffaa33'; // Gold Yellow Orange
    default: return '#19363f'; // Default dark teal
  }
}

export function getRarityColorDarkened(rarity: ArtifactDefinition['rarity']): string {
  switch (rarity) {
    case 'common': return '#888888'; // Dimmed silver
    case 'uncommon': return '#3a993a'; // Muted green
    case 'rare': return '#3477aa';   // Muted cyan-blue
    case 'epic': return '#7e3dbb';   // Dimmed purple
    case 'legendary': return '#aa6a22'; // Burnt gold
    default: return '#19363f'; // Very dark teal fallback
  }
}
