// src/game/powerups/registry/trees/fallbackCoreTree.ts

import type { PowerupNodeDefinition } from '../PowerupNodeDefinition';

export const fallbackCoreTree: PowerupNodeDefinition[] = [
  {
    id: 'core-reward+1',
    label: 'Core Reward',
    description: 'Grants you 1 Core. Can be selected multiple times.',
    icon: 'icon-core-reward',
    category: 'core',
    parentId: null,
    isProcedural: true,
    scaling: {}, // No metadata change; just repeatable
  },
];
