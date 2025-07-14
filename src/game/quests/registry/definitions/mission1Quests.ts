// src/game/quests/registry/definitions/mission1Quests.ts
// ──────────────────────────────────────────────────────────────
//  Mission 1 – Early-game onboarding & salvage loop
// ──────────────────────────────────────────────────────────────

import type { Quest } from '@/game/quests/interfaces/Quest';

export const mission1Quests: Record<string, Quest> = {
  /*───────────────────────────────────────────────────────────*
   *  Tutorial: first launch
   *───────────────────────────────────────────────────────────*/
  'ability:rollblocks': {
    id          : 'ability:rollblocks',
    name        : 'Gamble Your Destiny',
    icon        : 'quest_rollblocks',
    description : 'Survive for 8 minutes without dying.',
    /** TODO: introduce a “timeSurvived” QuestStep variant
     *        or break this into smaller temporal milestones. */
    steps       : [
      {
        kind     : 'timeSurvived',
        progress : 0,
        goal     : 8 * 60, // 8 minutes in seconds
      },
    ],

    rewards     : [
      {
        kind      : 'abilityUnlock',
        blurb     : 'Unlocks ability: "Roll Blocks"',
        abilityId : 'roll-blocks',
      },
    ],
  },

  /*───────────────────────────────────────────────────────────*
   *  Long-form collection quest
   *───────────────────────────────────────────────────────────*/
  'ability:combineblocks': {
    id          : 'ability:combineblocks',
    name        : 'Salvage Expertise',
    icon        : 'quest_combineblocks',
    description : 'Recover and Attach a Tier 5 Block.',
    /* TODO: introduce a “tier5BlocksAttached” step variant. */
    steps       : [
      {
        kind     : 'tier5BlocksAttached',
        progress : 0,
        goal     : 1,
      },
    ],

    rewards     : [
      {
        kind      : 'abilityUnlock',
        blurb     : 'Unlocks ability: "Combine Blocks"',
        abilityId : 'combine-blocks',
      },
    ],
  },

  /*───────────────────────────────────────────────────────────*
   *  Unlock Jump-Cast fast travel
   *───────────────────────────────────────────────────────────*/
  'ability:jumpcast': {
    id          : 'ability:jumpcast',
    name        : 'Exploration Incentive',
    icon        : 'quest_jumpcast',
    description : 'Explore all planets in the system.',
    steps       : [
      {
        kind     : 'planetsExplored',
        progress : true,
        goal     : true,
      },
    ],
    rewards     : [
      {
        kind      : 'abilityUnlock',
        blurb     : 'Unlocks ability: "Jump Cast"',
        abilityId : 'jump-cast',
      },
    ],
  },

  /*───────────────────────────────────────────────────────────*
   *  Slayer chain – space stations
   *───────────────────────────────────────────────────────────*/
  'slayer:station_slayer1': {
    id          : 'slayer:station_slayer1',
    name        : 'Space Station Slayer',
    icon        : 'quest_stationslayer',
    description : 'Destroy 10 space stations.',
    steps       : [
      {
        kind     : 'spaceStationsSlain',
        progress : 0,
        goal     : 10,
      },
    ],

    rewards     : [
      {
        kind    : 'core',
        blurb   : 'Receive: +100 Cores',
        amount  : 100,
      },
    ],
  },

  'slayer:station_slayer2': {
    id          : 'slayer:station_slayer2',
    name        : 'Space Station Slayer 2',
    icon        : 'quest_stationslayer_2',
    description : 'Destroy 8 Vanguard Stations.',
    steps       : [
      {
        kind     : 'spaceStations2Slain',
        progress : 0,
        goal     : 8,
      },
    ],

    rewards     : [
      {
        kind    : 'core',
        blurb   : 'Receive: +200 Cores',
        amount  : 200,
      },
    ],
    prerequisiteQuestId: 'slayer:station_slayer1',
  },

  /*───────────────────────────────────────────────────────────*
   *  Cursed Cargo – one-run objective
   *───────────────────────────────────────────────────────────*/
  'incidents:cursedcargo1': {
    id          : 'incidents:cursedcargo1',
    name        : 'Cursed Cargo',
    icon        : 'quest_cursedcargo',
    description : 'Recover 5 Cursed Cargos in one salvage run.',
    steps       : [
      {
        kind     : 'cursedCargoIncidentsCleared',
        progress : 0,
        goal     : 5,
      },
    ],

    rewards     : [
      {
        kind    : 'shipUnlock',
        blurb   : 'Unlocks: Godhand Prototype',
        shipId  : 'godhand',
      },
    ],
  },

  /*───────────────────────────────────────────────────────────*
   *  Brawler slayer – artifact reward
   *───────────────────────────────────────────────────────────*/
  'slayer:brawler1': {
    id          : 'slayer:brawler1',
    name        : 'Brawler Slayer',
    icon        : 'quest_brawler',
    description : 'Defeat 20 Brawlers in one salvage run.',
    steps       : [
      {
        kind     : 'brawlersSlain',
        progress : 0,
        goal     : 20,
      },
    ],

    rewards     : [
      {
        kind       : 'artifactUnlock',
        blurb      : 'Unlocks: Amped Scope',
        artifactId : 'amped-scope',
      },
    ],
  },
};
