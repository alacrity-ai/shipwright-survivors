// src/game/powerups/registry/trees/fortificationTree.ts

import type { PowerupNodeDefinition } from '../PowerupNodeDefinition';

export const fortificationTree: PowerupNodeDefinition[] = [
  // === Root Node ===
  {
    id: 'fortification-1',
    label: 'Fortress Builder',
    description: 'Reduces all damage taken by your ship.',
    icon: 'icon-fortress-builder',
    category: 'fortification',
    parentId: null,
    exclusiveBranchKey: 'fortification',
    metadata: {
      flatDamageReductionPercent: 0.05
    }
  },

  // === Branch A: Shield Fortification ===
  {
    id: 'fortification-shield-2',
    label: 'Shield Fortification',
    description: 'Your ship takes even less damage, and the cockpit is occasionally invulnerable.',
    icon: 'icon-shield-fortification',
    category: 'fortification',
    parentId: 'fortification-1',
    metadata: {
      flatDamageReductionPercent: 0.05,
      cockpitInvulnChance: 0.1
    }
  },
  {
    id: 'fortification-shield-3',
    label: 'Shield Fortification +1',
    description: 'Further increases damage reduction and cockpit protection.',
    icon: 'icon-shield-fortification',
    category: 'fortification',
    parentId: 'fortification-shield-2',
    metadata: {
      flatDamageReductionPercent: 0.05,
      cockpitInvulnChance: 0.1
    }
  },
  {
    id: 'fortification-shield-4',
    label: 'Shield Fortification +2',
    description: 'Further increases damage reduction and cockpit protection.',
    icon: 'icon-shield-fortification',
    category: 'fortification',
    parentId: 'fortification-shield-3',
    isProcedural: true,
    scaling: {
      flatDamageReductionPercent: 0.05,
      cockpitInvulnChance: 0.1
    }
  },
  {
    id: 'fortification-shield-5',
    label: 'Shield Fortification +3',
    description: 'Further increases damage reduction and cockpit protection.',
    icon: 'icon-shield-fortification',
    category: 'fortification',
    parentId: 'fortification-shield-4',
    isProcedural: true,
    scaling: {
      flatDamageReductionPercent: 0.05,
      cockpitInvulnChance: 0.1
    },
    capstoneAtLevel: 5
  },

  // === Branch B: Damage Reflection ===
  {
    id: 'fortification-reflect-2',
    label: 'Thorn Plating',
    description: 'Reflects a portion of damage taken back to the attacker.',
    icon: 'icon-thorn-plating',
    category: 'fortification',
    parentId: 'fortification-1',
    metadata: {
      flatDamageReductionPercent: 0.03,
      reflectOnDamagePercent: 0.50
    }
  },
  {
    id: 'fortification-reflect-3',
    label: 'Thorn Plating +1',
    description: 'Reflected damage can critically strike.',
    icon: 'icon-thorn-plating',
    category: 'fortification',
    parentId: 'fortification-reflect-2',
    metadata: {
      flatDamageReductionPercent: 0.03,
      reflectOnDamagePercent: 1.00,
      reflectCanCrit: true
    }
  },
  {
    id: 'fortification-reflect-4',
    label: 'Thorn Plating +2',
    description: 'Further increases damage reflection.',
    icon: 'icon-thorn-plating',
    category: 'fortification',
    parentId: 'fortification-reflect-3',
    isProcedural: true,
    scaling: {
      flatDamageReductionPercent: 0.03,
      reflectOnDamagePercent: 1.50
    }
  },
  {
    id: 'fortification-reflect-5',
    label: 'Thorn Plating +3',
    description: 'Further increases damage reflection.',
    icon: 'icon-thorn-plating',
    category: 'fortification',
    parentId: 'fortification-reflect-4',
    isProcedural: true,
    scaling: {
      flatDamageReductionPercent: 0.03,
      reflectOnDamagePercent: 2.00
    },
    capstoneAtLevel: 5
  }
];
