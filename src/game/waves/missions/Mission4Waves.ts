// src/game/waves/missions/Mission4Waves.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';


import { RammingBehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

const RAMMER_SPEAR_AFFIXES: ShipAffixes = {
  rammingDamageInflictMultiplier: 2.0,
  thrustPowerMulti: 2.0,
  turnPowerMulti: 2.0,
};

const SPEED_DEMON_AFFIXES: ShipAffixes = {
  thrustPowerMulti: 3.0,
  turnPowerMulti: 3.0,
};

export const waveDefinitions: WaveDefinition[] = [
  {
    spawnDistribution: 'outer',
    duration: 60,
    mods: [],
    ships: [
      { shipId: 'mission_04/spacestation_00', count: 8 },
      { shipId: 'station_mini', count: 16 },
      { shipId: 'wave_5_00', count: 12 },
    ],
    incidents: [
      {
        spawnChance: 1.0,
        script: 'BlackHoleIncident',
        options: {
          x: 0,
          y: 0,
        },
        label: 'Black Hole',
      },
    ],
  },
  {
    spawnDistribution: 'outer',
    duration: 60,
    mods: [],
    ships: [
      { shipId: 'mission_04/spacestation_00', count: 8 },
      { shipId: 'station_mini', count: 16 },
      { shipId: 'wave_5_00', count: 12 },
    ],
  },
  {
    spawnDistribution: 'outer',
    duration: 60,
    mods: [],
    ships: [
      { shipId: 'mission_04/spacestation_00', count: 8 },
      { shipId: 'station_mini', count: 16 },
      { shipId: 'wave_5_00', count: 12 },
    ],
  },
  {
    spawnDistribution: 'center',
    duration: Infinity,
    mods: ['shielded', 'extra-aggressive'],
    ships: [
      { shipId: 'mission_03/boss_03', count: 1, hunter: true },
    ],
    music: {
      file: 'assets/sounds/music/track_03_boss.mp3',
    },
    lightingSettings: {
      clearColor: [0.0, 0.0, 0.0, 0.0],
    },
    isBoss: true,
  },
];
