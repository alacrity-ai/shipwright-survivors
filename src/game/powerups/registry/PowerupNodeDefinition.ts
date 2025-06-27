// src/game/powerups/registry/PowerupNodeDefinition.ts

import type { PowerupEffectMetadata } from '@/game/powerups/types/PowerupMetadataTypes';

export interface PowerupNodeDefinition {
  /** Unique identifier for the powerup node */
  id: string;

  /** Display name shown to the user */
  label: string;

  /** Description used in the UI */
  description: string;

  /** Icon string used to map to a sprite/asset */
  icon: string;

  /** Logical category (e.g. 'defense', 'projectile') */
  category: string;

  /** Null if root, or ID of the parent node */
  parentId: string | null;

  /** Effect payload applied when node is owned */
  metadata?: PowerupEffectMetadata;

  /** Optional key to disallow other branches with the same exclusivity key */
  exclusiveBranchKey?: string;

  /** If true, this node is procedurally scaled rather than authored */
  isProcedural?: boolean;

  /**
   * Defines how this node’s effect scales from its immediate parent.
   * Only applies if `isProcedural` is true.
   */
  scaling?: Partial<PowerupEffectMetadata>;

  /**
   * If set, this node activates a special capstone effect once reached.
   * E.g., new mechanic, passive bonus, or special unlock.
   */
  capstoneAtLevel?: number;
}
