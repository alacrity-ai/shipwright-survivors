// src/game/ship/artifacts/interfaces/ArtifactDefinition.ts

import type { ArtifactEffectMetadata } from '@/game/ship/artifacts/interfaces/ArtifactEffectMetadata';

export interface ArtifactDefinition {
  id: string;                        // Globally unique artifact ID
  name: string;                      // UI display name
  description: string;               // Tooltip or flavor text
  icon: string;                      // Icon sprite key
  category?: string;                 // Optional grouping/tag for sorting (e.g., 'offense', 'utility')
  cost: number;                      // Metacurrency cost to unlock
  rarity: 'common' | 'rare' | 'epic' | 'legendary'; // For drop/visual tiers
  metadata: ArtifactEffectMetadata; // Semantic payload applied at runtime
}
