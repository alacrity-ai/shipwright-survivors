// src/game/powerups/registry/trees/resupplyTree.ts

import type { PowerupNodeDefinition } from '../PowerupNodeDefinition';

/**
 * “Resupply” branch — progressively grants the pilot additional random blocks,
 * skewed toward higher tiers as the tree ascends.  
 * All rewards are drawn from the global BlockRegistry and respect the player’s
 * current unlock set.  The branch is mutually-exclusive via `exclusiveBranchKey`.
 */
export const resupplyTree: PowerupNodeDefinition[] = [
  /* ─────────────── Root ─────────────── */
  {
    id: 'resupply-1',
    label: 'Field Drop I',
    description: 'Receive 3 random Tier 1 blocks.',
    icon: 'icon-resupply-crate',
    category: 'resupply',
    parentId: null,
    exclusiveBranchKey: 'resupply',
    metadata: { grantRandomBlocks: { tier: 1, count: 3 } },
  },

  /* ─────────────── Tier 2 ─────────────── */
  {
    id: 'resupply-2',
    label: 'Field Drop II',
    description: 'Receive 3 random Tier 2 blocks.',
    icon: 'icon-resupply-crate',
    category: 'resupply',
    parentId: 'resupply-1',
    metadata: { grantRandomBlocks: { tier: 2, count: 3 } },
    minLevelRequirement: 4,
  },

  /* ─────────────── Tier 3 ─────────────── */
  {
    id: 'resupply-3',
    label: 'Field Drop III',
    description: 'Receive 3 random Tier 3 blocks.',
    icon: 'icon-resupply-crate',
    category: 'resupply',
    parentId: 'resupply-2',
    metadata: { grantRandomBlocks: { tier: 3, count: 3 } },
    minLevelRequirement: 8,
  },

  /* ─────────────── Tier 4 ─────────────── */
  {
    id: 'resupply-4',
    label: 'Field Drop IV',
    description: 'Receive 3 random Tier 4 blocks.',
    icon: 'icon-resupply-crate',
    category: 'resupply',
    parentId: 'resupply-3',
    metadata: { grantRandomBlocks: { tier: 4, count: 3 } },
    minLevelRequirement: 12,
  },

  /* ─────────────── Tier 5 sequence ─────────────── */
  {
    id: 'resupply-5',
    label: 'High-Grade Cache I',
    description: 'Receive 1 random Tier 5 block.',
    icon: 'icon-resupply-elite',
    category: 'resupply',
    parentId: 'resupply-4',
    metadata: { grantRandomBlocks: { tier: 5, count: 1 } },
    minLevelRequirement: 16,
  },
  {
    id: 'resupply-6',
    label: 'High-Grade Cache II',
    description: 'Receive 1 additional random Tier 5 block.',
    icon: 'icon-resupply-elite',
    category: 'resupply',
    parentId: 'resupply-5',
    metadata: { grantRandomBlocks: { tier: 5, count: 1 } },
    minLevelRequirement: 17,
  },
  {
    id: 'resupply-7',
    label: 'High-Grade Cache III',
    description: 'Receive 1 additional random Tier 5 block.',
    icon: 'icon-resupply-elite',
    category: 'resupply',
    parentId: 'resupply-6',
    metadata: { grantRandomBlocks: { tier: 5, count: 1 } },
    minLevelRequirement: 18,
  },
  {
    id: 'resupply-8',
    label: 'High-Grade Cache IV',
    description: 'Receive 1 additional random Tier 5 block.',
    icon: 'icon-resupply-elite',
    category: 'resupply',
    parentId: 'resupply-7',
    metadata: { grantRandomBlocks: { tier: 5, count: 1 } },
    minLevelRequirement: 19,
  },

  /* ─────────────── Capstone ─────────────── */
  {
    id: 'resupply-9',
    label: 'Logistics Mastery',
    description: 'Receive 2 additional random Tier 5 blocks.',
    icon: 'icon-resupply-capstone',
    category: 'resupply',
    parentId: 'resupply-8',
    capstoneAtLevel: 5,
    metadata: { grantRandomBlocks: { tier: 5, count: 2 } },
    minLevelRequirement: 20,
  },
];
