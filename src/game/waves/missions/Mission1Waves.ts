// src/game/waves/missions/Mission1Waves.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';

export const waveDefinitions: WaveDefinition[] = [
  {
    id: 1,
    type: 'wave',
    mods: [],
    ships: [
      { shipId: 'wave_0_00', count: 40 },
      { shipId: 'wave_0_01', count: 40 },
      { shipId: 'wave_0_02', count: 32, hunter: true },
      { shipId: 'wave_0_03', count: 24, hunter: true },
      { shipId: 'wave_0_04', count: 12, hunter: true },
    ]
  },
  {
    id: 2,
    type: 'wave',
    mods: ['extra-aggressive'],
    ships: [
      { shipId: 'ship_0_00', count: 20 },
      { shipId: 'ship_0_01', count: 18 },
      { shipId: 'ship_0_02', count: 12 },
      { shipId: 'ship_0_03', count: 8, hunter: true },
      { shipId: 'ship_0_04', count: 6, hunter: true },
      { shipId: 'ship_0_station', count: 6 }
    ]
  },
  {
    id: 3,
    type: 'wave',
    mods: ['shielded'],
    ships: [
      { shipId: 'ship_scrapper_0', count: 12, hunter: true },
      { shipId: 'ship_scrapper_1', count: 10 },
      { shipId: 'ship_scrapper_2', count: 8, hunter: true },
      { shipId: 'ship_scrapper_3', count: 6 },
      { shipId: 'ship_scrapper_4', count: 5, hunter: true },
      { shipId: 'ship_scrapper_5', count: 4, hunter: true },
      { shipId: 'ship_scrapper_6', count: 3, hunter: true }
    ]
  },
  {
    id: 4,
    type: 'boss',
    mods: ['shielded', 'extra-aggressive'],
    ships: [
      { shipId: 'boss_0_00', count: 1, hunter: true }
    ],
    music: {
      file: 'assets/sounds/music/track_03_boss.mp3',
    },
    lightingSettings: {
      clearColor: [0.25, 0.0, 0.0, 0.0]
    }
  }
];