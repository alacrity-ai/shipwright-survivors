// src/game/waves/missions/Mission1Waves.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

import { SiegeBehaviorProfile } from '@/systems/ai/types/BehaviorProfile';
import { SpaceStationBehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

import { randomIntFromRange } from '@/shared/mathUtils';
import { createHourGlassFormation } from '@/systems/ai/formations/prefabs/createHourGlassFormation';
import { createMediumWedgeFormation } from '@/systems/ai/formations/prefabs/createMediumWedgeFormation';
import { createSmallWedgeFormation } from '@/systems/ai/formations/prefabs/createSmallWedgeFormation';
import { createLargeWedgeFormation } from '@/systems/ai/formations/prefabs/createLargeWedgeFormation';

const SPEED_DEMON_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 2.4,
  turnPowerMulti: 2.4,
};

const FAST_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 1.8,
  turnPowerMulti: 1.8,
};

const SUPER_FAST_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 4.4,
  turnPowerMulti: 4.4,
};

const TIER2_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 5.0,
  turnPowerMulti: 2.0,
  fireRateMulti: 2.0,
  projectileSpeedMulti: 1.5,
  blockDurabilityMulti: 2.0,
};

const TIER3_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 4.0,
  turnPowerMulti: 3.0,
  fireRateMulti: 2.5,
  projectileSpeedMulti: 2.5,
  blockDurabilityMulti: 3.0,
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

const hourGlassFormation = createHourGlassFormation(
  'hourglass',
  'ship_0_03',
  ['ship_0_02', 'ship_0_02', 'ship_0_02', 'ship_0_02', 'ship_0_02', 'ship_0_02'],
  FAST_AFFIXES,
  SPEED_DEMON_AFFIXES,
  600,
  2,
  true,
  true
);

const smallWedgeFormation = createSmallWedgeFormation(
  'small-wedge',
  'ship_0_02',
  ['ship_0_02', 'ship_0_02'],
  FAST_AFFIXES,
  FAST_AFFIXES,
  800,
  5,
  true
);

const tier2MediumWedgeFormation = createSmallWedgeFormation(
  'tier2-melee',
  'mission_02/tier2_fighter_00',
  ['mission_02/tier2_fighter_00', 'mission_02/tier2_fighter_00'],
  TIER2_AFFIXES,
  TIER2_AFFIXES,
  700,
  4,
  true
);

const mediumWedgeFormation = createMediumWedgeFormation(
  'medium-wedge',
  'ship_0_03',
  ['ship_0_02', 'ship_0_02', 'ship_0_02', 'ship_0_02'],
  FAST_AFFIXES,
  FAST_AFFIXES,
  700,
  3,
  true
);

const cruiserLargeWedgeFormation = createLargeWedgeFormation(
  'large-wedge',
  'ship_scrapper_4',
  ['ship_scrapper_3', 'ship_scrapper_3', 'ship_0_02', 'ship_0_02', 'ship_0_02', 'ship_0_02'],
  FAST_AFFIXES,
  FAST_AFFIXES,
  600,
  2,
  true
);

const tier2cruiserLargeWedgeFormation = createMediumWedgeFormation(
  'tier2-large-wedge',
  'mission_02/tier2_cruiser_00',
  ['mission_02/tier2_cruiser_01', 'mission_02/tier2_cruiser_01', 'mission_02/tier2_fighter_00', 'mission_02/tier2_fighter_00'],
  TIER3_AFFIXES,
  TIER3_AFFIXES,
  600,
  2,
  true
);

const killCrewFormation = createSmallWedgeFormation(
  'kill-crew',
  'ship_scrapper_6',
  ['ship_scrapper_6', 'ship_scrapper_6'],
  FAST_AFFIXES,
  FAST_AFFIXES,
  700,
  2,
  true,
  true
);

const siegerMeleeFormation = createSmallWedgeFormation(
  'kill-crew',
  'mission_02/tier2_sieger_00',
  ['mission_02/tier2_sieger_00', '/mission_02/tier2_sieger_00'],
  TIER2_AFFIXES,
  TIER2_AFFIXES,
  700,
  2,
  true,
  true,
  SiegeBehaviorProfile,
  SiegeBehaviorProfile
);

const speedHuntersFormation = createSmallWedgeFormation(
  'speed-hunters',
  'ship_0_02',
  ['ship_0_02', 'ship_0_02'],
  SUPER_FAST_AFFIXES,
  SUPER_FAST_AFFIXES,
  600,
  4,
  true,
  true
);

export const waveDefinitions: WaveDefinition[] = [
  {
    duration: 60,
    spawnDistribution: 'outer',
    mods: [],
    ships: [
      { shipId: 'wave_0_00', count: 20 },
      { shipId: 'mission_02/long_range_00', 
        count: 4, 
        hunter: true,
        affixes: FAST_AFFIXES,
        behaviorProfile: {
          ...SiegeBehaviorProfile,
          params: {
            ...SiegeBehaviorProfile.params,
            engagementRange: 2600,
            siegeRange: 2600,
            disengageRange: 5000,
          },
        },
      },
      { shipId: 'wave_0_02', count: 18, hunter: true },
      { shipId: 'wave_0_03', count: 16, hunter: true },
      { shipId: 'wave_0_04', count: 10, hunter: true },
      { shipId: 'ship_0_station', count: 8 }
    ],
    formations: [
      smallWedgeFormation,
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier1Params,
      },
      {
        spawnChance: 1.0,
        script: 'DimensionalPortalIncident',
        options: {
          maxDuration: 20,
          tiers: [
            [ // Tier 0: 0–4 kills
              { shipId: 'wave_0_00', count: 4, hunter: true }
            ],
            [ // Tier 1: 5–9 kills
              { shipId: 'wave_0_01', count: 4, hunter: true }
            ],
            [ // Tier 2: 10–14 kills
              { shipId: 'wave_0_02', count: 4, hunter: true }
            ],
            [ // Tier 3: 15–19 kills
              { shipId: 'wave_0_03', count: 4, hunter: true }
            ],
            [ // Tier 4+: 20+ kills
              { shipId: 'wave_0_04', count: 4, hunter: true }
            ],
            [ // Tier 4+: 25+ kills
              { shipId: 'ship_scrapper_4', count: 4, hunter: true }
            ],
            [ // Tier 4+: 30+ kills
              { shipId: 'ship_scrapper_5', count: 4, hunter: true }
            ],
            [ // Tier 4+: 35+ kills
              { shipId: 'ship_scrapper_6', count: 4, hunter: true }
            ],
          ],
        },
      }
    ],
  },
  {
    duration: 60,
    spawnDistribution: 'outer',
    mods: [],
    ships: [
      { shipId: 'wave_0_00', count: 20 },
      { shipId: 'mission_02/long_range_00', 
        count: 8, 
        hunter: true,
        affixes: FAST_AFFIXES,
        behaviorProfile: {
          ...SiegeBehaviorProfile,
          params: {
            ...SiegeBehaviorProfile.params,
            engagementRange: 2400,
            siegeRange: 2400,
            disengageRange: 5000,
          },
        },
      },
      { shipId: 'wave_0_02', count: 18, hunter: true },
      { shipId: 'wave_0_03', count: 12, hunter: true },
      { shipId: 'wave_0_04', count: 8, hunter: true },
    ],
    formations: [
      mediumWedgeFormation,
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier1Params,
      },
      {
        spawnChance: 1.0,
        script: 'DimensionalPortalIncident',
        options: {
          maxDuration: 20,
          tiers: [
            [ // Tier 0: 0–4 kills
              { shipId: 'wave_0_00', count: 4, hunter: true }
            ],
            [ // Tier 1: 5–9 kills
              { shipId: 'wave_0_01', count: 4, hunter: true }
            ],
            [ // Tier 2: 10–14 kills
              { shipId: 'wave_0_02', count: 4, hunter: true }
            ],
            [ // Tier 3: 15–19 kills
              { shipId: 'wave_0_03', count: 4, hunter: true }
            ],
            [ // Tier 4+: 20+ kills
              { shipId: 'wave_0_04', count: 4, hunter: true }
            ],
            [ // Tier 4+: 25+ kills
              { shipId: 'ship_scrapper_4', count: 4, hunter: true }
            ],
            [ // Tier 4+: 30+ kills
              { shipId: 'ship_scrapper_5', count: 4, hunter: true }
            ],
            [ // Tier 4+: 35+ kills
              { shipId: 'ship_scrapper_6', count: 4, hunter: true }
            ],
          ],
        },
      }
    ],
  },
  {
    duration: 60,
    spawnDistribution: 'outer',
    mods: [],
    ships: [
      { shipId: 'mission_02/long_range_00', 
        count: 16, 
        hunter: true,
        affixes: FAST_AFFIXES,
        behaviorProfile: {
          ...SiegeBehaviorProfile,
          params: {
            ...SiegeBehaviorProfile.params,
            engagementRange: 2800,
            siegeRange: 2800,
            disengageRange: 5000,
          },
        },
      },
      { shipId: 'mission_02/long_range_00', 
        count: 12, 
        hunter: true,
        affixes: FAST_AFFIXES,
        behaviorProfile: {
          ...SiegeBehaviorProfile,
          params: {
            ...SiegeBehaviorProfile.params,
            engagementRange: 2800,
            siegeRange: 2800,
            disengageRange: 5000,
          },
        },
      },
      { shipId: 'ship_0_03', count: 12, hunter: true },
      { shipId: 'ship_0_04', count: 12, hunter: true },
      { shipId: 'ship_0_station', count: 8 }
    ],
    formations: [
      hourGlassFormation,
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier1Params,
      },
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier1Params,
        delaySeconds: randomIntFromRange(10, 60),
      },
      {
        spawnChance: 1.0,
        script: 'DimensionalPortalIncident',
        options: {
          maxDuration: 20,
          tiers: [
            [ // Tier 0: 0–4 kills
              { shipId: 'ship_scrapper_4', count: 6 }
            ],
            [ // Tier 1: 5–9 kills
              { shipId: 'ship_scrapper_5', count: 6 }
            ],
            [ // Tier 2: 10–14 kills
              { shipId: 'ship_scrapper_6', count: 6, hunter: true }
            ],
            [ // Tier 3: 15–19 kills
              { shipId: 'mission_02/tier2_fighter_00', count: 6, hunter: true, affixes: TIER2_AFFIXES }
            ],
            [ // Tier 4+: 24+ kills
              { shipId: 'mission_02/tier2_fighter_00', count: 6, hunter: true, affixes: TIER2_AFFIXES }
            ],
            [ // Tier 4+: 29+ kills
              { shipId: 'mission_02/tier2_cruiser_00', count: 6, hunter: true, affixes: TIER2_AFFIXES }
            ],
            [ // Tier 4+: 34+ kills
              { shipId: 'mission_02/tier2_cruiser_00', count: 6, hunter: true, affixes: TIER2_AFFIXES }

            ],
            [ // Tier 4+: 39+ kills
              { shipId: 'mission_02/tier2_cruiser_01', count: 6, hunter: true, affixes: TIER2_AFFIXES }
            ],
          ],
        },
      }
    ],
  },
  {
    duration: 60,
    spawnDistribution: 'outer',    
    mods: [],
    ships: [
      { shipId: 'ship_scrapper_0', count: 12, hunter: true },
      { shipId: 'mission_02/long_range_00', 
        count: 12, 
        hunter: true,
        affixes: FAST_AFFIXES,
        behaviorProfile: {
          ...SiegeBehaviorProfile,
          params: {
            ...SiegeBehaviorProfile.params,
            engagementRange: 1800,
            siegeRange: 2800,
            disengageRange: 5000,
          },
        },
      },
      { shipId: 'ship_scrapper_2', count: 8, hunter: true, affixes: SUPER_FAST_AFFIXES },
      { shipId: 'ship_scrapper_3', count: 6, hunter: true, affixes: FAST_AFFIXES },
      { shipId: 'ship_scrapper_4', count: 5, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'ship_scrapper_5', count: 4, hunter: true, affixes: FAST_AFFIXES },
      { shipId: 'ship_scrapper_6', count: 3, hunter: true, affixes: FAST_AFFIXES },
      { shipId: 'ship_0_station', count: 4 }
    ],
    formations: [
      cruiserLargeWedgeFormation,
      killCrewFormation,
      speedHuntersFormation
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'QuantumBoomIncident',
      },
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier2Params,
        delaySeconds: randomIntFromRange(10, 60),
      },
    ],
  },
  {
    duration: 30,
    spawnDistribution: 'outer',    
    mods: [],
    ships: [
      { shipId: 'ship_scrapper_0', count: 12, hunter: true },
      { shipId: 'mission_02/long_range_00', 
        count: 16, 
        hunter: true,
        affixes: FAST_AFFIXES,
        behaviorProfile: {
          ...SiegeBehaviorProfile,
          params: {
            ...SiegeBehaviorProfile.params,
            engagementRange: 2200,
            siegeRange: 2200,
            disengageRange: 3200,
          },
        },
      },
      { shipId: 'mission_02/tier2_fighter_00', count: 8, hunter: true, affixes: TIER2_AFFIXES },
      { shipId: 'mission_02/tier3_station_00', count: 4, affixes: TIER2_AFFIXES }
    ],
    formations: [
      siegerMeleeFormation,
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier2Params,
        delaySeconds: randomIntFromRange(10, 60),
      },
    ],
  },
  {
    duration: 30,
    spawnDistribution: 'outer',    
    mods: [],
    ships: [
      { shipId: 'ship_scrapper_0', count: 8, hunter: true },
      { shipId: 'mission_02/long_range_00', 
        count: 8, 
        hunter: true,
        affixes: FAST_AFFIXES,
        behaviorProfile: {
          ...SiegeBehaviorProfile,
          params: {
            ...SiegeBehaviorProfile.params,
            engagementRange: 2200,
            siegeRange: 2200,
            disengageRange: 3200,
          },
        },
      },
      { shipId: 'mission_02/tier3_station_00', count: 8, affixes: TIER2_AFFIXES },
    ],
    formations: [
      tier2MediumWedgeFormation
    ]
  },
  {
    duration: 30,
    spawnDistribution: 'outer',    
    mods: [],
    ships: [],
    formations: [
      siegerMeleeFormation,
    ]
  },
  {
    duration: 30,
    spawnDistribution: 'outer',    
    mods: [],
    ships: [
      { shipId: 'mission_02/tier2_cruiser_00', count: 4, hunter: true, affixes: TIER3_AFFIXES },
      { shipId: 'mission_02/tier2_cruiser_01', count: 4, hunter: true, affixes: TIER3_AFFIXES },
      { shipId: 'mission_02/tier2_fighter_00', count: 8, hunter: true, affixes: TIER2_AFFIXES }
    ],
    formations: [
      tier2cruiserLargeWedgeFormation,
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier2Params,
        delaySeconds: randomIntFromRange(10, 60),
      },
      {
        spawnChance: 1.0,
        script: 'QuantumBoomIncident',
      },
    ],
  },
  {
    duration: 30,
    spawnDistribution: 'outer',    
    mods: [],
    ships: [
      { shipId: 'mission_02/tier2_fighter_00', count: 14, hunter: true, affixes: TIER2_AFFIXES },
    ],
    formations: [
      siegerMeleeFormation,
      tier2cruiserLargeWedgeFormation,
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: cursedCargoTier2Params,
        delaySeconds: randomIntFromRange(10, 60),
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
            engagementRange: 3200,
            siegeRange: 1600,
            disengageRange: 2800,
          },
        },
        affixes: {
          blockDurabilityMulti: 15.0,
          thrustPowerMulti: 4.0,
          turnPowerMulti: 0.8,
          fireRateMulti: 3.0,
          projectileSpeedMulti: 2.5,
        },
      },
    ],
    music: {
      file: 'assets/sounds/music/track_03_boss.mp3',
    },
    lightingSettings: {
      clearColor: [0.25, 0.0, 0.0, 0.0]
    },
    isBoss: true,
  }
];