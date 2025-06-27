// src/game/powerups/registry/trees/criticalHitTree.ts

import type { PowerupNodeDefinition } from '../PowerupNodeDefinition';

export const criticalHitTree: PowerupNodeDefinition[] = [
  // === Root Node ===
  {
    id: 'critical-hit-1',
    label: 'Critical Chance',
    description: 'Unlocks the ability to land critical hits for bonus damage.',
    icon: 'icon-critical-hit',
    category: 'critical-hit',
    parentId: null,
    exclusiveBranchKey: 'critical-hit',
    metadata: {
      critChance: 0.05,
      critMultiplier: 1.5
    }
  },

  // === Branch A: Critical Surge ===
  {
    id: 'critical-surge-2',
    label: 'Critical Surge',
    description: 'Increases your chance to land critical hits and their damage.',
    icon: 'icon-critical-surge',
    category: 'critical-hit',
    parentId: 'critical-hit-1',
    metadata: {
      critChance: 0.05,
      critMultiplier: 0.20
    }
  },
  {
    id: 'critical-surge-3',
    label: 'Critical Surge +1',
    description: 'Further increases critical chance and damage.',
    icon: 'icon-critical-surge',
    category: 'critical-hit',
    parentId: 'critical-surge-2',
    metadata: {
      critChance: 0.05,
      critMultiplier: 0.20
    }
  },
  {
    id: 'critical-surge-4',
    label: 'Critical Surge +2',
    description: 'Further increases critical chance and damage.',
    icon: 'icon-critical-surge',
    category: 'critical-hit',
    parentId: 'critical-surge-3',
    isProcedural: true,
    scaling: {
      critChance: 0.05,
      critMultiplier: 0.20
    }
  },
  {
    id: 'critical-surge-5',
    label: 'Critical Surge +3',
    description: 'Further increases critical chance and damage.',
    icon: 'icon-critical-surge',
    category: 'critical-hit',
    parentId: 'critical-surge-4',
    isProcedural: true,
    scaling: {
      critChance: 0.05,
      critMultiplier: 0.20
    },
    capstoneAtLevel: 5
  },

  // === Branch B: Vampirism ===
  {
    id: 'vampirism-2',
    label: 'Blood Pact',
    description: 'Critical hits heal you for a portion of the damage dealt.',
    icon: 'icon-blood-pact',
    category: 'critical-hit',
    parentId: 'critical-hit-1',
    metadata: {
      lifeStealOnCrit: true,
      critChance: 0.05,
      critLifeStealPercent: 0.05
    }
  },
  {
    id: 'vampirism-3',
    label: 'Blood Pact +1',
    description: 'Further enhances critical healing.',
    icon: 'icon-blood-pact',
    category: 'critical-hit',
    parentId: 'vampirism-2',
    metadata: {
      critChance: 0.05,
      critLifeStealPercent: 0.05,
    }
  },
  {
    id: 'vampirism-4',
    label: 'Blood Pact +2',
    description: 'Further enhances critical healing.',
    icon: 'icon-blood-pact',
    category: 'critical-hit',
    parentId: 'vampirism-3',
    isProcedural: true,
    scaling: {
      critChance: 0.05,
      critLifeStealPercent: 0.05,
    }
  },
  {
    id: 'vampirism-5',
    label: 'Blood Pact +3',
    description: 'Further enhances critical healing.',
    icon: 'icon-blood-pact',
    category: 'critical-hit',
    parentId: 'vampirism-4',
    isProcedural: true,
    scaling: {
      critChance: 0.05,
      critLifeStealPercent: 0.05,
    },
    capstoneAtLevel: 5
  }
];
