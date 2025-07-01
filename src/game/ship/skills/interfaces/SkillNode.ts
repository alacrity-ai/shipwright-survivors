// src/game/ship/skills/interfaces/SkillNode.ts

import type { ShipSkillEffectMetadata } from './ShipSkillEffectMetadata';

export interface SkillNode {
  id: string; // unique identifier within the tree
  name: string;
  description: string;
  icon: string; // registry key for cached sprite
  category?: string; // optional: for UI filtering/grouping
  cost: number;

  nodeSize: 'major' | 'minor';
  metadata: ShipSkillEffectMetadata;
}
