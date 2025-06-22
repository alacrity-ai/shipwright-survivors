// src/game/waves/missions/Mission1Waves.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

import { createHourGlassFormation } from '@/systems/ai/formations/prefabs/createHourGlassFormation';
import { createMediumWedgeFormation } from '@/systems/ai/formations/prefabs/createMediumWedgeFormation';
import { createSmallWedgeFormation } from '@/systems/ai/formations/prefabs/createSmallWedgeFormation';
import { createLargeWedgeFormation } from '@/systems/ai/formations/prefabs/createLargeWedgeFormation';

import { RammingBehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

const RAMMER_SPEAR_AFFIXES: ShipAffixes = {
  rammingDamageInflictMultiplier: 2.0,
  thrustPowerMulti: 2.8,
  turnPowerMulti: 2.8,
};

const SPEED_DEMON_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 3.0,
  turnPowerMulti: 3.0,
};

const FAST_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 1.8,
  turnPowerMulti: 1.8,
};

const SUPER_FAST_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 4.4,
  turnPowerMulti: 4.4,
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
  true
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
    spawnDistribution: 'aroundPlayer',
    duration: 30,
    mods: [],
    ships: [
      { shipId: 'wave_0_00', count: 4 },
      { shipId: 'wave_0_01', count: 4 },
      { shipId: 'wave_0_02', count: 4 },
    ],
    formations: [smallWedgeFormation],
  },
  {
    spawnDistribution: 'aroundPlayer',
    duration: 30,
    mods: [],
    ships: [
      { shipId: 'wave_0_01', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'wave_0_02', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'wave_0_03', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
    ],
    formations: [mediumWedgeFormation],
  },
  {
    spawnDistribution: 'aroundPlayer',
    duration: 30,
    mods: [],
    ships: [
      { shipId: 'wave_0_03', count: 12 },
      { shipId: 'wave_0_04', count: 14 },
    ],
    formations: [mediumWedgeFormation],
  },
  {
    spawnDistribution: 'aroundPlayer',
    duration: 30,
    mods: [],
    ships: [],
    formations: [killCrewFormation, smallWedgeFormation],
  },
  {
    spawnDistribution: 'aroundPlayer',
    duration: 10,
    mods: [],
    ships: [
      {
        shipId: 'mission_02/ship_rammerspear_00',
        count: 12,
        hunter: true,
        behaviorProfile: RammingBehaviorProfile,
        affixes: RAMMER_SPEAR_AFFIXES,
      },
    ],
  },
  {
    spawnDistribution: 'aroundPlayer',
    duration: 10,
    mods: [],
    ships: [
      {
        shipId: 'mission_02/ship_rammerspear_00',
        count: 12,
        hunter: true,
        behaviorProfile: RammingBehaviorProfile,
        affixes: RAMMER_SPEAR_AFFIXES,
      },
    ],
  },
  {
    spawnDistribution: 'aroundPlayer',
    duration: 10,
    mods: [],
    ships: [
      {
        shipId: 'mission_02/ship_rammerspear_00',
        count: 12,
        hunter: true,
        behaviorProfile: RammingBehaviorProfile,
        affixes: RAMMER_SPEAR_AFFIXES,
      },
    ],
  },
  {
    spawnDistribution: 'aroundPlayer',
    duration: 30,
    mods: [],
    ships: [
      {
        shipId: 'mission_02/ship_rammerspear_00',
        count: 12,
        hunter: true,
        behaviorProfile: RammingBehaviorProfile,
        affixes: RAMMER_SPEAR_AFFIXES,
      },
      {
        shipId: 'mission_02/ship_rammerhead_00',
        count: 4,
        hunter: true,
        behaviorProfile: RammingBehaviorProfile,
        affixes: RAMMER_SPEAR_AFFIXES,
      },
    ],
    formations: [speedHuntersFormation],
  },
  {
    spawnDistribution: 'aroundPlayer',
    duration: 30,
    mods: [],
    ships: [],
    formations: [cruiserLargeWedgeFormation, smallWedgeFormation, mediumWedgeFormation],
  },
  {
    spawnDistribution: 'aroundPlayer',
    duration: 20,
    mods: [],
    ships: [
      { shipId: 'mission_02/ship_minifly_00', count: 8, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'mission_02/ship_dragonfly_00', count: 20, hunter: true, affixes: SPEED_DEMON_AFFIXES },
    ],
  },
  {
    spawnDistribution: 'aroundPlayer',
    duration: 20,
    mods: [],
    ships: [
      {
        shipId: 'mission_02/ship_rammerspear_00',
        count: 12,
        behaviorProfile: RammingBehaviorProfile,
        affixes: RAMMER_SPEAR_AFFIXES,
      },
      {
        shipId: 'mission_02/ship_rammerhead_00',
        count: 2,
        behaviorProfile: RammingBehaviorProfile,
        affixes: RAMMER_SPEAR_AFFIXES,
      },
    ],
    formations: [killCrewFormation],
  },
  {
    spawnDistribution: 'aroundPlayer',
    duration: 20,
    mods: [],
    ships: [
      { shipId: 'mission_02/spacestation_00', count: 4 },
      { shipId: 'mission_02/wave_5_03', count: 4 },
    ],
    formations: [cruiserLargeWedgeFormation, smallWedgeFormation],
  },
  {
    spawnDistribution: 'aroundPlayer',
    duration: 20,
    mods: [],
    ships: [
      {
        shipId: 'mission_02/ship_rammerspear_00',
        count: 12,
        hunter: true,
        behaviorProfile: RammingBehaviorProfile,
        affixes: RAMMER_SPEAR_AFFIXES,
      },
      { shipId: 'mission_02/ship_stalker_00', count: 4, hunter: true },
      { shipId: 'mission_02/wave_5_03', count: 4 },
    ],
    formations: [killCrewFormation],
  },
  {
    spawnDistribution: 'center',
    duration: Infinity,
    mods: [],
    ships: [{ shipId: 'boss_0_00', count: 1, hunter: true }],
    music: {
      file: 'assets/sounds/music/track_03_boss.mp3',
    },
    lightingSettings: {
      clearColor: [0.25, 0.0, 0.0, 0.0],
    },
    isBoss: true,
  },
];
