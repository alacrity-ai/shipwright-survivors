// src/game/powerups/registry/trees/engineResupplyTree.ts

import type { PowerupNodeDefinition } from '@/game/powerups/registry/PowerupNodeDefinition';

/**
 * “Engine Resupply” branch — progressively grants the pilot additional
 * engine‑class blocks, skewed toward higher tiers as the tree ascends.
 * Uses grantEngineBlocks instead of grantRandomBlocks.
 * The branch is mutually‑exclusive via `exclusiveBranchKey`.
 */
export const engineResupplyTree: PowerupNodeDefinition[] = [
  /* ─────────────── Root ─────────────── */
  {
    id: 'engine-resupply-1',
    label: 'Engine Drop I',
    description: 'Receive 2 random Tier 1 engine blocks.',
    icon: 'icon-resupply-crate',
    category: 'engine-resupply',
    parentId: null,
    exclusiveBranchKey: 'engine-resupply',
    metadata: { grantEngineBlocks: { tier: 1, count: 2 } },
    channel: 'veil',
  },

  /* ─────────────── Tier 2 ─────────────── */
  {
    id: 'engine-resupply-2',
    label: 'Engine Drop II',
    description: 'Receive 2 random Tier 2 engine blocks.',
    icon: 'icon-resupply-crate',
    category: 'engine-resupply',
    parentId: 'engine-resupply-1',
    metadata: { grantEngineBlocks: { tier: 2, count: 2 } },
    channel: 'veil',
  },

  /* ─────────────── Tier 3 ─────────────── */
  {
    id: 'engine-resupply-3',
    label: 'Engine Drop III',
    description: 'Receive 2 random Tier 3 engine blocks.',
    icon: 'icon-resupply-crate',
    category: 'engine-resupply',
    parentId: 'engine-resupply-2',
    metadata: { grantEngineBlocks: { tier: 3, count: 2 } },
    channel: 'veil',
  },

  /* ─────────────── Tier 4 ─────────────── */
  {
    id: 'engine-resupply-4',
    label: 'Engine Drop IV',
    description: 'Receive 2 random Tier 4 engine blocks.',
    icon: 'icon-resupply-crate',
    category: 'engine-resupply',
    parentId: 'engine-resupply-3',
    metadata: { grantEngineBlocks: { tier: 4, count: 2 } },
    channel: 'veil',
  },

  /* ─────────────── Tier 5 sequence ─────────────── */
  {
    id: 'engine-resupply-5',
    label: 'High‑Performance Cache I',
    description: 'Receive 2 random Tier 5 engine blocks.',
    icon: 'icon-resupply-elite',
    category: 'engine-resupply',
    parentId: 'engine-resupply-4',
    metadata: { grantEngineBlocks: { tier: 5, count: 2 } },
    channel: 'veil',
  },
  {
    id: 'engine-resupply-6',
    label: 'High‑Performance Cache II',
    description: 'Receive 2 additional random Tier 5 engine blocks.',
    icon: 'icon-resupply-elite',
    category: 'engine-resupply',
    parentId: 'engine-resupply-5',
    metadata: { grantEngineBlocks: { tier: 5, count: 2 } },
    channel: 'veil',
  },
  {
    id: 'engine-resupply-7',
    label: 'High‑Performance Cache III',
    description: 'Receive 2 additional random Tier 5 engine blocks.',
    icon: 'icon-resupply-elite',
    category: 'engine-resupply',
    parentId: 'engine-resupply-6',
    metadata: { grantEngineBlocks: { tier: 5, count: 2 } },
    channel: 'veil',
  },
  {
    id: 'engine-resupply-8',
    label: 'High‑Performance Cache IV',
    description: 'Receive 2 additional random Tier 5 engine blocks.',
    icon: 'icon-resupply-elite',
    category: 'engine-resupply',
    parentId: 'engine-resupply-7',
    metadata: { grantEngineBlocks: { tier: 5, count: 2 } },
    channel: 'veil',
  },

  /* ─────────────── Capstone ─────────────── */
  {
    id: 'engine-resupply-9',
    label: 'Propulsion Mastery',
    description: 'Receive 2 additional random Tier 5 engine blocks.',
    icon: 'icon-resupply-capstone',
    category: 'engine-resupply',
    parentId: 'engine-resupply-8',
    capstoneAtLevel: 5,
    metadata: { grantEngineBlocks: { tier: 5, count: 2 } },
    channel: 'veil',
  },
];
