// src/game/ship/skills/interfaces/StarterShipSkillTree.ts

import type { PositionedSkillNode } from './PositionedSkillNode';

export interface StarterShipSkillTree {
  shipId: string; // e.g. 'vanguard'
  displayName: string; // for UI

  gridSize: number; // e.g. 12 — defines visual layout size

  maxSelectableNodes: number; // always 5 for now

  nodes: PositionedSkillNode[]; // full layout
}
