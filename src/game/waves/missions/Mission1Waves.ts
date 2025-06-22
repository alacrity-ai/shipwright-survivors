// src/game/waves/missions/Mission1Waves.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

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
    spawnDistribution: 'outer',
    mods: [],
    ships: [
      { shipId: 'wave_0_00', count: 32 },
      { shipId: 'wave_0_01', count: 32 },
      { shipId: 'wave_0_02', count: 28, hunter: true },
      { shipId: 'wave_0_03', count: 22, hunter: true },
      { shipId: 'wave_0_04', count: 12, hunter: true },
    ],
    formations: [
      smallWedgeFormation,
      mediumWedgeFormation,
    ]
  },
  {
    spawnDistribution: 'outer',
    mods: [],
    ships: [
      { shipId: 'ship_0_00', count: 20 },
      { shipId: 'ship_0_01', count: 18 },
      { shipId: 'ship_0_02', count: 12 },
      { shipId: 'ship_0_03', count: 8, hunter: true },
      { shipId: 'ship_0_04', count: 6, hunter: true },
      { shipId: 'ship_0_station', count: 8 }
    ],
    formations: [
      hourGlassFormation,
      smallWedgeFormation,
    ]
  },
  {
    spawnDistribution: 'outer',    
    mods: [],
    ships: [
      { shipId: 'ship_scrapper_0', count: 12, hunter: true },
      { shipId: 'ship_scrapper_1', count: 10 },
      { shipId: 'ship_scrapper_2', count: 8, hunter: true },
      { shipId: 'ship_scrapper_3', count: 6 },
      { shipId: 'ship_scrapper_4', count: 5, hunter: true },
      { shipId: 'ship_scrapper_5', count: 4, hunter: true },
      { shipId: 'ship_scrapper_6', count: 3, hunter: true },
      { shipId: 'ship_0_station', count: 4 }
    ],
    formations: [
      cruiserLargeWedgeFormation,
      killCrewFormation,
      mediumWedgeFormation,
      speedHuntersFormation
    ]
  },
  {
    spawnDistribution: 'center',
    duration: Infinity,    
    mods: [],
    ships: [
      { shipId: 'boss_0_00', count: 1, hunter: true }
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