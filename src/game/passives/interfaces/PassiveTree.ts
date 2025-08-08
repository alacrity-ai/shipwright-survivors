// src/game/passives/interfaces/PassiveTree.ts

import type { PositionedPassiveNode } from '@/game/passives/interfaces/PositionedPassiveNode';
import type { PassiveConnection } from '@/game/passives/interfaces/PassiveConnection';

/**
 * Full passive tree definition as exported from the passive editor.
 * Matches the JSON schema loaded at runtime.
 */
export interface PassiveTree {
  gridSize: number;
  squares: PositionedPassiveNode[];
  connections: PassiveConnection[];
  timestamp: string; // ISO 8601 string
}
