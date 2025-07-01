// src/game/ship/skills/helpers/validateSkillTree.ts

import type { StarterShipSkillTree } from '@/game/ship/skills/interfaces/StarterShipSkillTree';

export function validateSkillTree(tree: StarterShipSkillTree): void {
  const ids = new Set(tree.nodes.map(n => n.node.id));
  for (const n of tree.nodes) {
    for (const conn of n.connectedTo) {
      if (!ids.has(conn)) {
        throw new Error(`[SkillTree] Node '${n.node.id}' connects to unknown node '${conn}'`);
      }
    }
  }
}
