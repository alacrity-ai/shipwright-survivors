// src/game/ship/skills/registry/StarterShipSkillTreeRegistry.ts

import type { StarterShipSkillTree } from '@/game/ship/skills/interfaces/StarterShipSkillTree';

import { sw1SkillTree } from '@/game/ship/skills/registry/definitions/sw1';
import { vanguardSkillTree } from '@/game/ship/skills/registry/definitions/vanguard';
import { monarchSkillTree } from '@/game/ship/skills/registry/definitions/monarch';
import { haloSkillTree } from '@/game/ship/skills/registry/definitions/halo';
import { godhandSkillTree } from '@/game/ship/skills/registry/definitions/godhand';

const internalRegistry: Record<string, StarterShipSkillTree> = {
  [sw1SkillTree.shipId]: sw1SkillTree,
  [vanguardSkillTree.shipId]: vanguardSkillTree,
  [monarchSkillTree.shipId]: monarchSkillTree,
  [haloSkillTree.shipId]: haloSkillTree,
  [godhandSkillTree.shipId]: godhandSkillTree,
};

export function getStarterShipSkillTree(shipId: string): StarterShipSkillTree {
  const tree = internalRegistry[shipId];
  if (!tree) {
    throw new Error(
      `[StarterShipSkillTreeRegistry] No skill tree found for shipId "${shipId}". ` +
      `Ensure it is registered in /registry/definitions and added to internalRegistry.`
    );
  }
  return tree;
}

export function getAllStarterSkillTrees(): StarterShipSkillTree[] {
  return Object.values(internalRegistry);
}

export function hasSkillTreeForShip(shipId: string): boolean {
  return shipId in internalRegistry;
}
