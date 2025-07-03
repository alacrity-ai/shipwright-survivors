// src/game/waves/missions/Mission1Waves.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

import { createHourGlassFormation } from '@/systems/ai/formations/prefabs/createHourGlassFormation';
import { createMediumWedgeFormation } from '@/systems/ai/formations/prefabs/createMediumWedgeFormation';
import { createSmallWedgeFormation } from '@/systems/ai/formations/prefabs/createSmallWedgeFormation';
import { createLargeWedgeFormation } from '@/systems/ai/formations/prefabs/createLargeWedgeFormation';
import { SiegeBehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

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
  3,
  true,
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
  true,
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
    duration: 30,
    spawnDistribution: 'aroundPlayer',
    mods: [],
    ships: [
      { shipId: 'wave_0_02', count: 6, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'wave_0_03', count: 6, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'wave_0_04', count: 6, hunter: true, affixes: SUPER_FAST_AFFIXES },
      { shipId: 'ship_0_station', count: 8 }
    ],
    formations: [
      smallWedgeFormation,
    ],
  },
  {
    duration: 30,
    spawnDistribution: 'aroundPlayer',
    mods: [],
    ships: [],
    formations: [
      smallWedgeFormation,
      mediumWedgeFormation,
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: {},
        label: 'Cursed Cargo',
      },
    ],
  },
  {
    duration: 30,
    spawnDistribution: 'outer',
    mods: [],
    ships: [
      { shipId: 'ship_0_01', count: 4, hunter: true, affixes: FAST_AFFIXES },
      { shipId: 'ship_0_04', count: 6, hunter: true, affixes: SUPER_FAST_AFFIXES },
      { shipId: 'ship_0_station', count: 4 }
    ],
    formations: [
      hourGlassFormation,
      smallWedgeFormation,
    ]
  },
  {
    duration: 30,
    spawnDistribution: 'aroundPlayer',
    mods: [],
    ships: [
      { shipId: 'wave_0_02', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'wave_0_03', count: 4, hunter: true, affixes: SUPER_FAST_AFFIXES },
      { shipId: 'wave_0_04', count: 4, hunter: true, affixes: SUPER_FAST_AFFIXES },
    ],
    formations: [
      mediumWedgeFormation,
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: {},
        label: 'Cursed Cargo',
      },
      {
        spawnChance: 1.0,
        script: 'DimensionalPortalIncident',
        options: {
          maxDuration: 20,
          tiers: [
            [ // Tier 0: 0–4 kills
              { shipId: 'wave_0_00', count: 4 }
            ],
            [ // Tier 1: 5–9 kills
              { shipId: 'wave_0_01', count: 4 }
            ],
            [ // Tier 2: 10–14 kills
              { shipId: 'wave_0_02', count: 4, hunter: true }
            ],
            [ // Tier 3: 15–19 kills
              { shipId: 'wave_0_03', count: 4, hunter: true }
            ],
            [ // Tier 4+: 24+ kills
              { shipId: 'wave_0_04', count: 4, hunter: true }
            ],
            [ // Tier 4+: 29+ kills
              { shipId: 'ship_scrapper_4', count: 4, hunter: true }
            ],
            [ // Tier 4+: 34+ kills
              { shipId: 'ship_scrapper_5', count: 4, hunter: true }
            ],
            [ // Tier 4+: 39+ kills
              { shipId: 'ship_scrapper_6', count: 4, hunter: true }
            ],
          ],
        },
      }
    ],
  },
  {
    duration: 20,
    spawnDistribution: 'outer',    
    mods: [],
    ships: [
      { shipId: 'ship_scrapper_0', count: 6, hunter: true, affixes: FAST_AFFIXES },
      { shipId: 'ship_scrapper_1', count: 6, hunter: true, affixes: SUPER_FAST_AFFIXES },
    ],
    formations: [
      speedHuntersFormation
    ],
  },
  {
    duration: 20,
    spawnDistribution: 'outer',    
    mods: [],
    ships: [
      { shipId: 'ship_scrapper_2', count: 4, hunter: true, affixes: SUPER_FAST_AFFIXES },
      { shipId: 'ship_scrapper_3', count: 4, hunter: true, affixes: FAST_AFFIXES },
      { shipId: 'ship_scrapper_4', count: 4, hunter: true, affixes: FAST_AFFIXES },
    ],
    formations: [
      cruiserLargeWedgeFormation,
    ],
  },
  {
    duration: 20,
    spawnDistribution: 'outer',    
    mods: [],
    ships: [
      { shipId: 'ship_scrapper_3', count: 4, hunter: true, affixes: SUPER_FAST_AFFIXES },
      { shipId: 'ship_scrapper_4', count: 4, hunter: true, affixes: SUPER_FAST_AFFIXES },
      { shipId: 'ship_scrapper_5', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'ship_scrapper_6', count: 4, hunter: true, affixes: FAST_AFFIXES },
    ],
    formations: [
      killCrewFormation,
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'QuantumBoomIncident',
      },
    ],
  },
  {
    duration: 20,
    spawnDistribution: 'outer',    
    mods: [],
    ships: [
      { shipId: 'ship_scrapper_2', count: 4, hunter: true, affixes: SUPER_FAST_AFFIXES },
      { shipId: 'ship_scrapper_5', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'ship_scrapper_6', count: 4, hunter: true, affixes: FAST_AFFIXES },
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: {},
        label: 'Cursed Cargo',
      },
    ],
    formations: [
      killCrewFormation,
    ],
  },
  {
    duration: 20,
    spawnDistribution: 'outer',    
    mods: [],
    ships: [
      { shipId: 'ship_scrapper_5', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'ship_scrapper_6', count: 4, hunter: true, affixes: FAST_AFFIXES },
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: {},
        label: 'Cursed Cargo',
      },
    ],
    formations: [
      killCrewFormation,
    ],
  },
  {
    duration: 20,
    spawnDistribution: 'outer',    
    mods: [],
    ships: [
      { shipId: 'ship_scrapper_4', count: 8, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'ship_scrapper_5', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'ship_scrapper_6', count: 4, hunter: true, affixes: SUPER_FAST_AFFIXES },
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'CursedCargoIncident',
        options: {},
        label: 'Cursed Cargo',
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
            siegeRange: 1800,
            disengageRange: 2800,
          },
        },
        affixes: {
          blockDurabilityMulti: 8.0,
          thrustPowerMulti: 4.0,
          turnPowerMulti: 1.2,
          fireRateMulti: 3.0,
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