// src/game/powerups/registry/trees/weaponResupplyTree.ts

import type { PowerupNodeDefinition } from '@/game/powerups/registry/PowerupNodeDefinition';

/**
 * “Weapon Resupply” branch — progressively grants the pilot additional
 * weapon‑class blocks, skewed toward higher tiers as the tree ascends.
 * Uses grantWeaponBlocks instead of grantRandomBlocks.
 * The branch is mutually‑exclusive via `exclusiveBranchKey`.
 */
export const weaponResupplyTree: PowerupNodeDefinition[] = [
  /* ─────────────── Root ─────────────── */
  {
    id: 'weapon-resupply-1',
    label: 'Weapon Drop I',
    description: 'Receive 2 random Tier 1 weapon blocks.',
    icon: 'icon-weapon-crate',
    category: 'weapon-resupply',
    parentId: null,
    exclusiveBranchKey: 'weapon-resupply',
    metadata: { grantWeaponBlocks: { tier: 1, count: 2 } },
    channel: 'veil',
  },

  /* ─────────────── Tier 2 ─────────────── */
  {
    id: 'weapon-resupply-2',
    label: 'Weapon Drop II',
    description: 'Receive 2 random Tier 2 weapon blocks.',
    icon: 'icon-weapon-crate',
    category: 'weapon-resupply',
    parentId: 'weapon-resupply-1',
    metadata: { grantWeaponBlocks: { tier: 2, count: 2 } },
    channel: 'veil',
  },

  /* ─────────────── Tier 3 ─────────────── */
  {
    id: 'weapon-resupply-3',
    label: 'Weapon Drop III',
    description: 'Receive 2 random Tier 3 weapon blocks.',
    icon: 'icon-weapon-crate',
    category: 'weapon-resupply',
    parentId: 'weapon-resupply-2',
    metadata: { grantWeaponBlocks: { tier: 3, count: 2 } },
    channel: 'veil',
  },

  /* ─────────────── Tier 4 ─────────────── */
  {
    id: 'weapon-resupply-4',
    label: 'Weapon Drop IV',
    description: 'Receive 2 random Tier 4 weapon blocks.',
    icon: 'icon-weapon-crate',
    category: 'weapon-resupply',
    parentId: 'weapon-resupply-3',
    metadata: { grantWeaponBlocks: { tier: 4, count: 2 } },
    channel: 'veil',
  },

  /* ─────────────── Tier 5 sequence ─────────────── */
  {
    id: 'weapon-resupply-5',
    label: 'Advanced Arsenal I',
    description: 'Receive 2 random Tier 5 weapon blocks.',
    icon: 'icon-weapon-elite',
    category: 'weapon-resupply',
    parentId: 'weapon-resupply-4',
    metadata: { grantWeaponBlocks: { tier: 5, count: 2 } },
    channel: 'veil',
  },
  {
    id: 'weapon-resupply-6',
    label: 'Advanced Arsenal II',
    description: 'Receive 2 additional random Tier 5 weapon blocks.',
    icon: 'icon-weapon-elite',
    category: 'weapon-resupply',
    parentId: 'weapon-resupply-5',
    metadata: { grantWeaponBlocks: { tier: 5, count: 2 } },
    channel: 'veil',
  },
  {
    id: 'weapon-resupply-7',
    label: 'Advanced Arsenal III',
    description: 'Receive 2 additional random Tier 5 weapon blocks.',
    icon: 'icon-weapon-elite',
    category: 'weapon-resupply',
    parentId: 'weapon-resupply-6',
    metadata: { grantWeaponBlocks: { tier: 5, count: 2 } },
    channel: 'veil',
  },
  {
    id: 'weapon-resupply-8',
    label: 'Advanced Arsenal IV',
    description: 'Receive 2 additional random Tier 5 weapon blocks.',
    icon: 'icon-weapon-elite',
    category: 'weapon-resupply',
    parentId: 'weapon-resupply-7',
    metadata: { grantWeaponBlocks: { tier: 5, count: 2 } },
    channel: 'veil',
  },

  /* ─────────────── Capstone ─────────────── */
  {
    id: 'weapon-resupply-9',
    label: 'Ordnance Mastery',
    description: 'Receive 2 additional random Tier 5 weapon blocks.',
    icon: 'icon-weapon-capstone',
    category: 'weapon-resupply',
    parentId: 'weapon-resupply-8',
    capstoneAtLevel: 5,
    metadata: { grantWeaponBlocks: { tier: 5, count: 2 } },
    channel: 'veil',
  },
];
