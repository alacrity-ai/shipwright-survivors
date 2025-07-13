// src/game/powerups/registry/trees/blockAffinityTree.ts

import type { PowerupNodeDefinition } from '../PowerupNodeDefinition';

export const blockAffinityTree: PowerupNodeDefinition[] = [
  /* ─────────────── Root ─────────────── */
  {
    id: 'affinity-block-1',
    label: 'Affinity Block I',
    description:
      "Attach a Tier 1 block that matches your ship's weapon affinity.",
    icon: 'icon-affinity-block',
    category: 'block-affinity',
    parentId: null,
    exclusiveBranchKey: 'block-affinity',
    metadata: {
      attachAffinityBlockTier: 1,
    },
  },

  /* ─────────────── Tier 2 ─────────────── */
  {
    id: 'affinity-block-2',
    label: 'Affinity Block II',
    description:
      "Attach a Tier 2 block that matches your ship's weapon affinity.",
    icon: 'icon-affinity-block',
    category: 'block-affinity',
    parentId: 'affinity-block-1',
    metadata: {
      attachAffinityBlockTier: 2,
    },
    minLevelRequirement: 5,
  },

  /* ─────────────── Tier 3 ─────────────── */
  {
    id: 'affinity-block-3',
    label: 'Affinity Block III',
    description:
      "Attach a Tier 3 block that matches your ship's weapon affinity.",
    icon: 'icon-affinity-block',
    category: 'block-affinity',
    parentId: 'affinity-block-2',
    metadata: {
      attachAffinityBlockTier: 3,
    },
    minLevelRequirement: 10,
  },

  /* ─────────────── Tier 4 ─────────────── */
  {
    id: 'affinity-block-4',
    label: 'Affinity Block IV',
    description:
      "Attach a Tier 4 block that matches your ship's weapon affinity.",
    icon: 'icon-affinity-block',
    category: 'block-affinity',
    parentId: 'affinity-block-3',
    metadata: {
      attachAffinityBlockTier: 4,
    },
    minLevelRequirement: 15,
  },

  /* ──────────── Capstone ──────────── */
  {
    id: 'affinity-block-5',
    label: 'Affinity Mastery',
    description:
      'Upgrade all existing affinity blocks on your ship by +1 tier.',
    icon: 'icon-affinity-block-capstone',
    category: 'block-affinity',
    parentId: 'affinity-block-4',
    capstoneAtLevel: 5,
    metadata: {
      upgradeAffinityBlocksByTier: 1,
    },
    minLevelRequirement: 20,
  },
];
