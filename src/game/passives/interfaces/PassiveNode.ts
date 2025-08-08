// src/game/passives/interfaces/PassiveNode.ts

import type { PassiveNodeMetadata } from './PassiveNodeMetadata';

/**
 * Base definition of a passive node, independent of position or connections.
 */
export interface PassiveNode {
  id: string;                 // Unique identifier
  name: string;               // Player-facing name
  description: string;        // Tooltip description
  icon: string;                // Key for passiveIconCache
  nodeSize: 'minor' | 'major';
  cost: number;               // Cost in Cores to unlock
  metadata: PassiveNodeMetadata; // Effect payload
}
