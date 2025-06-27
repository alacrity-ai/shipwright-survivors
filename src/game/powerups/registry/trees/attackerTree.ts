// src/game/powerups/registry/trees/attackerTree.ts

import type { PowerupNodeDefinition } from '../PowerupNodeDefinition';

export const attackerTree: PowerupNodeDefinition[] = [
  // === Root Node ===
  {
    id: 'attacker-1',
    label: "Attacker's Arsenal",
    description: 'Increases base damage and fire rate for all weapons.',
    icon: 'icon-attackers-arsenal',
    category: 'attacker',
    parentId: null,
    exclusiveBranchKey: 'attacker',
    metadata: {
      baseDamageMultiplier: 0.15,
      fireRateMultiplier: 0.1
    }
  },

  // === Branch A: Rapid Fire ===
  {
    id: 'rapid-fire-2',
    label: 'Rapid Fire',
    description: 'Significantly boosts fire rate across all weapons.',
    icon: 'icon-rapid-fire',
    category: 'attacker',
    parentId: 'attacker-1',
    metadata: {
      fireRateMultiplier: 0.1
    }
  },
  {
    id: 'rapid-fire-3',
    label: 'Rapid Fire +1',
    description: 'Further increases fire rate.',
    icon: 'icon-rapid-fire',
    category: 'attacker',
    parentId: 'rapid-fire-2',
    metadata: {
      fireRateMultiplier: 0.1
    }
  },
  {
    id: 'rapid-fire-4',
    label: 'Rapid Fire +2',
    description: 'Further increases fire rate.',
    icon: 'icon-rapid-fire',
    category: 'attacker',
    parentId: 'rapid-fire-3',
    isProcedural: true,
    scaling: {
      fireRateMultiplier: 0.1
    }
  },
  {
    id: 'rapid-fire-5',
    label: 'Rapid Fire +3',
    description: 'Further increases fire rate.',
    icon: 'icon-rapid-fire',
    category: 'attacker',
    parentId: 'rapid-fire-4',
    isProcedural: true,
    scaling: {
      fireRateMultiplier: 0.1
    },
    capstoneAtLevel: 5
  },

  // === Branch B: Deadly Damage ===
  {
    id: 'deadly-damage-2',
    label: 'Deadly Damage',
    description: 'Massively boosts weapon damage output.',
    icon: 'icon-deadly-damage',
    category: 'attacker',
    parentId: 'attacker-1',
    metadata: {
      baseDamageMultiplier: 0.15
    }
  },
  {
    id: 'deadly-damage-3',
    label: 'Deadly Damage +1',
    description: 'Further increases weapon damage.',
    icon: 'icon-deadly-damage',
    category: 'attacker',
    parentId: 'deadly-damage-2',
    metadata: {
      baseDamageMultiplier: 0.15
    }
  },
  {
    id: 'deadly-damage-4',
    label: 'Deadly Damage +2',
    description: 'Further increases weapon damage.',
    icon: 'icon-deadly-damage',
    category: 'attacker',
    parentId: 'deadly-damage-3',
    isProcedural: true,
    scaling: {
      baseDamageMultiplier: 0.15
    }
  },
  {
    id: 'deadly-damage-5',
    label: 'Deadly Damage +3',
    description: 'Further increases weapon damage.',
    icon: 'icon-deadly-damage',
    category: 'attacker',
    parentId: 'deadly-damage-4',
    isProcedural: true,
    scaling: {
      baseDamageMultiplier: 0.15
    },
    capstoneAtLevel: 5
  }
];
