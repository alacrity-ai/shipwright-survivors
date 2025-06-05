// src/game/waves/missions/Mission1Waves.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';

export const waveDefinitions: WaveDefinition[] = [
  {
    id: 1,
    type: 'wave',
    mods: [],
    ships: [
      { shipId: 'wave_0_00', count: 22 },
      { shipId: 'wave_0_01', count: 20 },
      { shipId: 'wave_0_02', count: 14 },
      { shipId: 'wave_0_03', count: 14 },
      { shipId: 'wave_0_04', count: 8 },
      { shipId: '/earlygame/ship_turret_00', count: 10 },
      { shipId: '/earlygame/ship_miniturret_00', count: 20 },
      { shipId: '/earlygame/ship_rammerspear_00', count: 14, hunter: true },
      { shipId: '/earlygame/ship_rammerhead_00', count: 614, hunter: true },
    ]
  },
  {
    id: 2,
    type: 'wave',
    mods: ['extra-aggressive'],
    ships: [
      { shipId: '/earlygame/ship_turret_00', count: 10 },
      { shipId: '/earlygame/ship_miniturret_00', count: 8 },
      { shipId: '/earlygame/ship_rammerspear_00', count: 16, hunter: true },
      { shipId: '/earlygame/ship_rammerhead_00', count: 6, hunter: true },
      { shipId: '/earlygame/ship_dragonfly_00', count: 12, hunter: true },
      { shipId: '/earlygame/ship_minifly_00', count: 20, hunter: true },
      { shipId: '/earlygame/ship_lanceturret_00', count: 10 },
      { shipId: '/earlygame/ship_sentry_00', count: 12 },
      { shipId: '/earlygame/ship_stalker_00', count: 4, hunter: true },
    ]
  },
  {
    id: 3,
    type: 'wave',
    mods: ['shielded'],
    ships: [
      { shipId: '/earlygame/ship_turret_00', count: 14 },
      { shipId: '/earlygame/ship_miniturret_00', count: 22 },
      { shipId: '/earlygame/ship_rammerspear_00', count: 28, hunter: true },
      { shipId: '/earlygame/ship_rammerhead_00', count: 14, hunter: true },
      { shipId: '/earlygame/ship_dragonfly_00', count: 14, hunter: true },
      { shipId: '/earlygame/ship_minifly_00', count: 18, hunter: true },
    ]
  },
  {
    id: 4,
    type: 'boss',
    mods: ['shielded', 'extra-aggressive'],
    ships: [
      { shipId: 'boss_0_00', count: 1, hunter: true }
    ]
  }
];