// src/game/waves/missions/Mission1Waves.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

import { randomIntFromRange } from '@/shared/mathUtils';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';
import { DefaultBehaviorProfile, SpaceStationBehaviorProfile } from '@/systems/ai/types/BehaviorProfile';
import { createHourGlassFormation } from '@/systems/ai/formations/prefabs/createHourGlassFormation';
import { createMediumWedgeFormation } from '@/systems/ai/formations/prefabs/createMediumWedgeFormation';
import { createSmallWedgeFormation } from '@/systems/ai/formations/prefabs/createSmallWedgeFormation';
import { createLargeWedgeFormation } from '@/systems/ai/formations/prefabs/createLargeWedgeFormation';

import { RammingBehaviorProfile, SiegeBehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

const RAMMER_SPEAR_AFFIXES: ShipAffixes = {
  rammingDamageInflictMultiplier: 2.0,
  thrustPowerMulti: 2.4,
  turnPowerMulti: 2.4,
  blockDurabilityMulti: 0.25,
};

const RAMMER_SPEAR_AFFIXES_TIER2: ShipAffixes = {
  rammingDamageInflictMultiplier: 2.0,
  thrustPowerMulti: 2.2,
  turnPowerMulti: 2.2,
  blockDurabilityMulti: 0.75,
};

const SPEED_DEMON_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 3.0,
  turnPowerMulti: 3.0,
};

const TIER2_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 2.0,
  turnPowerMulti: 2.0,
  fireRateMulti: 1.0,
  projectileSpeedMulti: 2.0,
  blockDurabilityMulti: 2.0,
  blockDropRateMulti: 0.5,
};

const TIER3_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 2.0,
  turnPowerMulti: 2.0,
  fireRateMulti: 1.0,
  projectileSpeedMulti: 1.0,
  blockDurabilityMulti: 3.0,
};

const FAST_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 1.8,
  turnPowerMulti: 1.8,
};

const BATFIGHTER_00_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 1.6,
  turnPowerMulti: 1.6,
  fireRateMulti: 0.8,
  projectileLifetimeMulti: 3.0,
  projectileSpeedMulti: 0.5,
  blockDurabilityMulti: 0.25,
  blockDropRateMulti: 2.0,
};

const BATFIGHTER_00_BEHAVIOR: BehaviorProfile = {
  ...DefaultBehaviorProfile,
  params: {
    engagementRange: 1600,
    disengageRange: 2800,
    orbitRadius: 1600,
  }
};

const BATFIGHTER_01_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 1.6,
  turnPowerMulti: 1.6,
  fireRateMulti: 1.0,
  projectileLifetimeMulti: 5.0,
  projectileSpeedMulti: 0.2,
  blockDurabilityMulti: 0.25,
  blockDropRateMulti: 2.0,
};

const BATFIGHTER_01_BEHAVIOR: BehaviorProfile = {
  ...SiegeBehaviorProfile,
  params: {
    engagementRange: 2000,
    disengageRange: 2800,
    siegeRange: 2000,
  }
};

const SPACESTATION_AFFIXES: ShipAffixes = {
  fireRateMulti: 0.5,
  projectileSpeedMulti: 0.5,
  blockDurabilityMulti: 0.5,
  projectileLifetimeMulti: 2.0,
};

const SIEGESTATION_AFFIXES: ShipAffixes = {
  fireRateMulti: 0.5,
  blockDurabilityMulti: 0.5,
  projectileSpeedMulti: 0.5
};

const SIEGESTATION_BEHAVIOR: BehaviorProfile = {
  ...SpaceStationBehaviorProfile,
  params: {
    ...SpaceStationBehaviorProfile.params,
    engagementRange: 2200,
    siegeRange: 2200,
    disengageRange: 2800,
  },
};

const FASTER_AND_WEAK_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 2.2,
  turnPowerMulti: 2.2,
  blockDurabilityMulti: 0.5,
};

const SUPER_FAST_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 4.4,
  turnPowerMulti: 4.4,
};

const cursedCargoTier1Params = {
  rewardBlockTier: 1,
  rewardQuantityMultiplier: 1,
  ships: [
    { shipId: 'incidents/cursed_cargo/cursed_cargo_killer_00', count: 4 },
    { shipId: 'incidents/cursed_cargo/cursed_cargo_killer_01', count: 4 },
  ],
  cursedCacheShip: { shipId: 'incidents/cursed_cargo/cursed_cargo_00', count: 1 },
};

const cursedCargoTier2Params = {
  rewardBlockTier: 2,
  rewardQuantityMultiplier: 1,
  ships: [
    { shipId: 'incidents/cursed_cargo/cursed_cargo_killer_02', count: 4 },
    { shipId: 'incidents/cursed_cargo/cursed_cargo_killer_03', count: 4 },
  ],
  cursedCacheShip: { shipId: 'incidents/cursed_cargo/cursed_cargo_01', count: 1 },
};

const smallWedgeFormation = createSmallWedgeFormation(
  'small-wedge',
  'ship_0_02',
  ['ship_0_02', 'ship_0_02'],
  FAST_AFFIXES,
  FAST_AFFIXES,
  800,
  3,
  true,
  true
);

const mediumWedgeFormation = createMediumWedgeFormation(
  'medium-wedge',
  'ship_0_03',
  ['ship_0_02', 'ship_0_02', 'ship_0_02', 'ship_0_02'],
  FAST_AFFIXES,
  FAST_AFFIXES,
  700,
  5,
  true
);

const cruiserLargeWedgeFormation = createLargeWedgeFormation(
  'large-wedge',
  'ship_scrapper_4',
  ['ship_scrapper_3', 'ship_scrapper_3', 'ship_0_02', 'ship_0_02', 'ship_0_02', 'ship_0_02'],
  FAST_AFFIXES,
  FAST_AFFIXES,
  600,
  4,
  true
);

const killCrewFormation = createSmallWedgeFormation(
  'kill-crew',
  'mission_02/wave_5_03',
  ['mission_02/wave_5_03', '/mission_02/wave_5_03'],
  FAST_AFFIXES,
  FAST_AFFIXES,
  700,
  3,
  true,
  true,
  SiegeBehaviorProfile,
  SiegeBehaviorProfile
);

const hunterCrewFormation = createSmallWedgeFormation(
  'hunter-crew',
  'mission_02/missile_hunter_01',
  ['mission_02/missile_hunter_00', 'mission_02/missile_hunter_00'],
  FAST_AFFIXES,
  FAST_AFFIXES,
  700,
  2,
  true,
  true,
);

const speedHuntersFormation = createSmallWedgeFormation(
  'speed-hunters',
  'ship_0_02',
  ['ship_0_02', 'ship_0_02'],
  SUPER_FAST_AFFIXES,
  SUPER_FAST_AFFIXES,
  600,
  8,
  true,
  true
);

export const waveDefinitions: WaveDefinition[] = [
  {
    sustainMode: true,
    spawnDistribution: 'aroundPlayer',
    duration: 60,
    mods: [],
    ships: [
      // { shipId: 'mission_02/ship_rammerspear_00', count: 4, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES },
      {
        shipId: 'mission_02/new/batfighter_00',
        count: 4,
        hunter: true,
        affixes: BATFIGHTER_00_AFFIXES,
        behaviorProfile: BATFIGHTER_00_BEHAVIOR,
      },
      { shipId: 'mission_02/spacestation_00', count: 4, affixes: SPACESTATION_AFFIXES },
      { shipId: 'mission_02/new/siege_station_00', count: 6, affixes: SIEGESTATION_AFFIXES },
    ],
    incidents: [
      {
        spawnChance: 1.0,
        delaySeconds: 10,
        script: 'CursedCargoIncident',
        options: cursedCargoTier1Params,
      },
      {
        spawnChance: 1.0,
        delaySeconds: 30,
        script: 'CursedCargoIncident',
        options: cursedCargoTier1Params,
      },
    ],
  },
  {
    sustainMode: true,
    spawnDistribution: 'aroundPlayer',
    duration: 60,
    mods: [],
    ships: [
      // { shipId: 'mission_02/ship_rammerspear_00', count: 4, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES },
      {
        shipId: 'mission_02/new/batfighter_00',
        count: 4,
        hunter: true,
        affixes: BATFIGHTER_00_AFFIXES,
        behaviorProfile: BATFIGHTER_00_BEHAVIOR,
      },
      {
        shipId: 'mission_02/new/batfighter_01',
        count: 4,
        hunter: true,
        affixes: BATFIGHTER_01_AFFIXES,
        behaviorProfile: BATFIGHTER_01_BEHAVIOR,
      },
      { shipId: 'mission_02/new/siege_station_00', count: 4, affixes: SIEGESTATION_AFFIXES },
      { shipId: 'mission_02/spacestation_00', count: 4, affixes: SPACESTATION_AFFIXES },
    ],
  },
  {
    sustainMode: true,
    spawnDistribution: 'aroundPlayer',
    duration: 60,
    mods: [],
    ships: [
      { shipId: 'mission_02/ship_rammerspear_00', count: 4, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES },
      {
        shipId: 'mission_02/new/batfighter_00',
        count: 6,
        hunter: true,
        affixes: BATFIGHTER_00_AFFIXES,
        behaviorProfile: BATFIGHTER_00_BEHAVIOR,
      },
      {
        shipId: 'mission_02/new/batfighter_01',
        count: 6,
        hunter: true,
        affixes: BATFIGHTER_01_AFFIXES,
        behaviorProfile: BATFIGHTER_01_BEHAVIOR,
      },
      { shipId: 'mission_02/spacestation_00', count: 2, affixes: SPACESTATION_AFFIXES },
      { shipId: 'mission_02/new/siege_station_00', count: 4, affixes: SIEGESTATION_AFFIXES },

    ],
  },
  {
    sustainMode: true,
    spawnDistribution: 'aroundPlayer',
    duration: 60,
    mods: [],
    ships: [
      { shipId: 'mission_02/ship_dragonfly_00', count: 8, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'mission_02/wave_5_03', count: 8, hunter: true, behaviorProfile: SiegeBehaviorProfile, affixes: TIER2_AFFIXES },
      // {
      //   shipId: 'mission_02/new/batfighter_00',
      //   count: 6,
      //   hunter: true,
      //   affixes: FAST_AND_WEAK_AFFIXES,
      // },
      // {
      //   shipId: 'mission_02/new/batfighter_01',
      //   count: 6,
      //   hunter: true,
      //   affixes: FASTER_AND_WEAK_AFFIXES,
      // },
      { shipId: 'mission_02/spacestation_00', count: 2, affixes: SPACESTATION_AFFIXES },
      { shipId: 'mission_02/new/siege_station_00', count: 2, affixes: SIEGESTATION_AFFIXES },
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'QuantumBoomIncident',
      },
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier1Params,
      },
      {
        spawnChance: 1.0,
        script: 'DimensionalPortalIncident',
        options: {
          maxDuration: 30,
          tiers: [
            [ // Tier 0: 0–4 kills
              { shipId: 'mission_02/ship_stalker_00', count: 4, hunter: true }
            ],
            [ // Tier 1: 5–9 kills
              { shipId: 'mission_02/ship_stalker_00', count: 4, hunter: true }
            ],
            [ // Tier 2: 10–14 kills
              { shipId: 'mission_02/ship_stalker_00', count: 8, hunter: true }
            ],
            [ // Tier 3: 15–19 kills
              { shipId: 'mission_02/ship_dragonfly_00', count: 8, hunter: true }
            ],
            [ // Tier 4+: 20+ kills
              { shipId: 'mission_02/wave_5_03', count: 8, hunter: true }
            ],
          ],
        },
      }
    ],
  },
  {
    sustainMode: true,
    spawnDistribution: 'aroundPlayer',
    duration: 20,
    mods: [],
    ships: [
      { shipId: 'mission_02/ship_rammerspear_00', count: 16, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES },
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'QuantumBoomIncident',
      },
    ],
  },
  {
    sustainMode: true,
    spawnDistribution: 'aroundPlayer',
    duration: 20,
    mods: [],
    ships: [
      { shipId: 'mission_02/ship_rammerspear_00', count: 12, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES },
      { shipId: 'mission_02/new/ship_rammerspear_01', count: 16, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES_TIER2 },
    ],
  },
  {
    sustainMode: true,
    spawnDistribution: 'aroundPlayer',
    duration: 20,
    mods: [],
    ships: [
      { shipId: 'mission_02/ship_rammerspear_00', count: 12, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES },
      { shipId: 'mission_02/new/ship_rammerspear_01', count: 12, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES_TIER2 },
      { shipId: 'mission_02/new/ship_rammerspear_02', count: 16, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES_TIER2 },

    ],
  },
  {
    sustainMode: true,
    spawnDistribution: 'aroundPlayer',
    duration: 60,
    mods: [],
    ships: [
      { shipId: 'mission_02/bomber_00', count: 4, hunter: true, affixes: TIER3_AFFIXES },
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'QuantumBoomIncident',
      },
      // Cursed Cargo
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier2Params,
      },
      // Cursed Cargo
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier2Params,
      },
    ]
  },
  {
    sustainMode: true,
    spawnDistribution: 'aroundPlayer',
    duration: 60,
    mods: [],
    ships: [
      { shipId: 'mission_02/bomber_00', count: 4, hunter: true, affixes: TIER3_AFFIXES },
      { shipId: 'mission_02/bomber_01', count: 4, hunter: true, affixes: TIER3_AFFIXES, behaviorProfile: SiegeBehaviorProfile },
    ],
  },
  {
    sustainMode: true,
    spawnDistribution: 'aroundPlayer',
    duration: 60,
    mods: [],
    ships: [
      {
        shipId: 'mission_02/new/ship_rammerspear_02',
        count: 8,
        hunter: true,
        behaviorProfile: RammingBehaviorProfile,
        affixes: RAMMER_SPEAR_AFFIXES_TIER2,
      },
      { shipId: 'mission_02/bomber_00', count: 4, hunter: true, affixes: TIER3_AFFIXES },
      { shipId: 'mission_02/bomber_01', count: 4, hunter: true, affixes: TIER3_AFFIXES },
      { shipId: 'mission_02/bomber_03', count: 4, hunter: true, affixes: TIER3_AFFIXES },

    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'QuantumBoomIncident',
      },
    ],
  },
  {
    spawnDistribution: 'center',
    duration: Infinity,
    mods: [],
    ships: [
      {
        shipId: 'boss_0_00',
        count: 1,
        hunter: true,
        behaviorProfile: {
          ...SiegeBehaviorProfile,
          params: {
            ...SiegeBehaviorProfile.params,
            engagementRange: 2400,
            siegeRange: 1600,
            disengageRange: 2800,
          },
        },
        affixes: {
          blockDurabilityMulti: 20.0,
          thrustPowerMulti: 4.0,
          turnPowerMulti: 1.2,
          fireRateMulti: 3.0,
          projectileLifetimeMulti: 2.0,
          projectileSpeedMulti: 2.5,
        },
      },
    ],
    music: {
      file: 'assets/sounds/music/track_03_boss.mp3',
    },
    lightingSettings: {
      clearColor: [0.25, 0.0, 0.0, 0.0],
    },
    isBoss: true,
  },
  // {
  //   spawnDistribution: 'outer',
  //   duration: 20,
  //   mods: [],
  //   ships: [
  //     { shipId: 'mission_03/haloblade_minicruiser_00', count: 4, hunter: true },
  //     { shipId: 'mission_03/haloblade_cruiser_00', count: 6, hunter: true },
  //     { shipId: 'mission_03/horrorhunter_00', count: 4, hunter: true },
  //     { shipId: 'mission_03/horror_station_00', count: 2 },
  //     { shipId: 'mission_03/speedhunter_00', count: 4, hunter: true },
  //     { shipId: 'mission_03/haloblade_cruiser_00', count: 4, hunter: true },
  //   ],
  //   music: {
  //     file: 'assets/sounds/music/track_07_mission5.mp3',
  //   }
  // },
  // {
  //   spawnDistribution: 'outer',
  //   duration: 20,
  //   mods: [],
  //   ships: [
  //     { shipId: 'mission_03/horrorhunter_01', count: 2, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //     { shipId: 'mission_03/horrorhunter_02', count: 2, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //     { shipId: 'mission_03/horrorhunter_00', count: 6, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //     { shipId: 'mission_03/speedhunter_00', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //     { shipId: 'mission_03/haloblade_cruiser_00', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //   ],
  //   formations: [hunterCrewFormation],
  //   incidents: [
  //       {
  //         spawnChance: 1.0,
  //         script: 'CursedCargoIncident',
  //         options: cursedCargoTier2Params,
  //       },
  //       {
  //         spawnChance: 1.0,
  //         script: 'CursedCargoIncident',
  //         options: cursedCargoTier2Params,
  //         delaySeconds: randomIntFromRange(10, 60),
  //       },
  //       {
  //         spawnChance: 0.5,
  //         script: 'CursedCargoIncident',
  //         options: cursedCargoTier2Params,
  //         delaySeconds: randomIntFromRange(10, 60),
  //       },
  //       {
  //         spawnChance: 1.0,
  //         script: 'DimensionalPortalIncident',
  //         options: {
  //           maxDuration: 30,
  //           tiers: [
  //             [ // Tier 0: 0–4 kills
  //               { shipId: 'mission_03/horrorhunter_01', count: 4, hunter: true }
  //             ],
  //             [ // Tier 1: 5–9 kills
  //               { shipId: 'mission_03/horrorhunter_01', count: 4, hunter: true }
  //             ],
  //             [ // Tier 2: 10–14 kills
  //               { shipId: 'mission_03/horrorhunter_02', count: 8, hunter: true }
  //             ],
  //             [ // Tier 3: 15–19 kills
  //               { shipId: 'mission_03/haloblade_cruiser_00', count: 8, hunter: true }
  //             ],
  //             [ // Tier 4+: 20+ kills
  //               { shipId: 'mission_03/haloblade_cruiser_00', count: 8, hunter: true }
  //             ],
  //           ],
  //         },
  //       }
  //     ],
  // },
  // {
  //   spawnDistribution: 'outer',
  //   duration: 20,
  //   mods: [],
  //   ships: [
  //     { shipId: 'mission_03/horrorhunter_01', count: 2, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //     { shipId: 'mission_03/horrorhunter_02', count: 2, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //     { shipId: 'mission_03/horrorhunter_00', count: 6, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //     { shipId: 'mission_03/speedhunter_00', count: 12, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //     { shipId: 'mission_03/haloblade_cruiser_00', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //   ],
  //   formations: [hunterCrewFormation, hunterCrewFormation],
  // },
  // {
  //   spawnDistribution: 'outer',
  //   duration: 20,
  //   mods: [],
  //   ships: [
  //     { shipId: 'mission_03/horrorhunter_01', count: 2, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //     { shipId: 'mission_03/horrorhunter_02', count: 2, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //     { shipId: 'mission_03/speedhunter_00', count: 12, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //     { shipId: 'mission_03/haloblade_cruiser_00', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //   ],
  //   formations: [hunterCrewFormation, hunterCrewFormation],
  // },
  // {
  //   spawnDistribution: 'outer',
  //   duration: 20,
  //   mods: [],
  //   ships: [
  //     { shipId: 'ship_deathcruiser_4', count: 8, hunter: true, affixes: SPEED_DEMON_AFFIXES },
  //   ],
  //   formations: [hunterCrewFormation],
  // },
  // {
  //   spawnDistribution: 'center',
  //   duration: Infinity,
  //   mods: [],
  //   ships: [
  //     {
  //       shipId: 'mission_03/boss_03',
  //       count: 1,
  //       hunter: true,
  //       behaviorProfile: {
  //         ...SiegeBehaviorProfile,
  //         params: {
  //           ...SiegeBehaviorProfile.params,
  //           siegeRange: 1600,
  //           disengageRange: 2800,
  //         },
  //       },
  //       affixes: {
  //         blockDurabilityMulti: 15.0,
  //         thrustPowerMulti: 4.0,
  //         turnPowerMulti: 1.0,
  //         fireRateMulti: 2.0,
  //       },
  //     },
  //   ],
  //   music: {
  //     file: 'assets/sounds/music/track_03_boss.mp3',
  //   },
  //   lightingSettings: {
  //     clearColor: [0.25, 0.0, 0.0, 0.0],
  //   },
  //   isBoss: true,
  // },
];
