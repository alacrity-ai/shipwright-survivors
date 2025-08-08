// src/game/passives/interfaces/PositionedPassiveNode.ts

import type { PassiveNode } from './PassiveNode';

/**
 * A passive node with positional and connectivity data for tree layout.
 */
export interface PositionedPassiveNode {
  node: PassiveNode;
  x: number;                  // Grid-space X coordinate
  y: number;                  // Grid-space Y coordinate
  connectedTo: string[];      // List of node IDs this connects to
  isStarter?: boolean;        // Player can unlock immediately if true
}
