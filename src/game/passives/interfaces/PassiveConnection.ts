// src/game/passives/interfaces/PassiveConnection.ts

/**
 * Explicit connection between two passive node positions.
 * Used for rendering the tree and validating connectivity.
 */
export interface PassiveConnection {
  from: { x: number; y: number };
  to: { x: number; y: number };
}
