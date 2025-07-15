// src/game/player/registry/AbilityRegistry.ts

export interface AbilityDef {
  name: string;
  description: string;
  iconKey: string;
}

/**
 * The object is now keyed *by* AbilityKey, giving us a true
 * Record<AbilityKey, AbilityDef> that TypeScript can index safely.
 */
export const AbilityRegistry = {
  'pulse': {
    name: 'Afterburner Pulse',
    description: 'Ignite afterburners for a brief surge of velocity.',
    iconKey: 'icon-pulse',
  },
  'attach-block': {
    name: 'Attach Block',
    description: 'Affix the highlighted block to your ship.',
    iconKey: 'icon-attach-block',
  },
  'attach-all-blocks': {
    name: 'Attach All Blocks',
    description: 'Attach every queued block in one action.',
    iconKey: 'icon-attach-all',
  },
  'roll-blocks': {
    name: 'Roll Blocks',
    description: 'Reroll the first three queued blocks.',
    iconKey: 'icon-roll-blocks',
  },
  'combine-blocks': {
    name: 'Combine Blocks',
    description: 'Fuse identical blocks to raise their tier.',
    iconKey: 'icon-combine-blocks',
  },
  'jump-cast': {
    name: 'Jump Cast',
    description: 'Execute a short-range hyperspace jump.',
    iconKey: 'icon-jump-cast',
  },
  'active-contracts': {
    name: 'Active Contracts',
    description: 'Access your active contracts and quests.',
    iconKey: 'icon-active-contracts',
  },
} as const satisfies Record<string, AbilityDef>;


/** Literal union of all registry keys.  */
export type AbilityKey = keyof typeof AbilityRegistry;

/** O(1) dictionary lookup with perfect inference. */
export function getAbility<K extends AbilityKey>(key: K) {
  return AbilityRegistry[key];
}
