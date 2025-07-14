// src/game/quests/registry/definitions/mission1Quests.ts

// ──────────────────────────────────────────────────────────────
//  Mission 1 – Early-game onboarding & salvage loop
// ──────────────────────────────────────────────────────────────

import type { Quest } from '@/game/quests/interfaces/Quest';

export const mission1Quests: Record<string, Quest> = {
  // Tutorial: first launch
  'ability:rollblocks': {
    id          : 'ability:rollblocks',
    name        : 'Gamble Your Destiny',
    icon        : 'quest_rollblocks',
    description : 'Survive for 8 minutes without dying.',
    rewards     : [
      { 
        kind: 'abilityUnlock', 
        blurb: 'Unlocks ability: "Roll Blocks"', 
        abilityId: 'roll-blocks' 
      },
    ],
  },

  // Long-form collection quest
  'ability:combineblocks': {
    id          : 'ability:combineblocks',
    name        : 'Salvage Expertise',
    icon        : 'quest_combineblocks',
    description : 'Recover and Attach a Tier 5 Block.',
    rewards     : [
      {
        kind     : 'abilityUnlock',
        blurb    : 'Unlocks ability: "Combine Blocks"',
        abilityId: 'combine-blocks',
      },
    ],
  },

  // Quest for unlocking Jump Cast fast travel
  'ability:jumpcast': {
    id          : 'ability:jumpcast',
    name        : 'Exploration Incentive',
    icon        : 'quest_jumpcast',
    description : 'Explore all planets in the system.',
    rewards     : [
      {
        kind     : 'abilityUnlock',
        blurb    : 'Unlocks ability: "Jump Cast"',
        abilityId: 'jump-cast',
      },
    ],
  },

  // Quest for unlocking 100 Cores, space station slayer (station_slayer)
  'slayer:station_slayer1': {
    id          : 'slayer:station_slayer1',
    name        : 'Space Station Slayer',
    icon        : 'quest_stationslayer',
    description : 'Destroy 10 space stations.',
    rewards     : [
      {
        kind     : 'core',
        blurb    : 'Receive: +100 Cores',
        amount   : 100,
      },
    ],
  },

  // Quest for defeating 5 Cursed Cargos in one salvage run
  'incidents:cursedcargo1': {
    id          : 'incidents:cursedcargo1',
    name        : 'Cursed Cargo',
    icon        : 'quest_cursedcargo',
    description : 'Recover 5 Cursed Cargos in one salvage run.',
    rewards     : [
      {
        kind     : 'shipUnlock',
        blurb    : 'Unlocks: Godhand Prototype',
        shipId   : 'godhand',
      },
    ],
  },
};
