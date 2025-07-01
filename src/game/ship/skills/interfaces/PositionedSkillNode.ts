// src/game/ship/skills/interfaces/PositionedSkillNode.ts

import type { SkillNode } from '@/game/ship/skills/interfaces/SkillNode';

export interface PositionedSkillNode {
  node: SkillNode;

  x: number; // grid-space coordinate
  y: number;

  connectedTo: string[]; // list of node IDs this one connects to
  isStarter?: boolean;   // if true, player may unlock it immediately
}
