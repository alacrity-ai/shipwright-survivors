// src/game/waves/missions/Mission1Waves.ts

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
    id: 1,
    type: 'wave',
    mods: [],
    ships: [
      { shipId: 'wave_0_00', count: 24 },
      { shipId: 'wave_0_01', count: 22 },
      { shipId: 'wave_0_02', count: 16 },
      { shipId: 'wave_0_03', count: 16 },
      { shipId: 'wave_0_04', count: 18 },
      { shipId: 'wave_0_00', count: 8, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'wave_0_01', count: 6, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'wave_0_02', count: 8, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'wave_0_03', count: 4, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'wave_0_04', count: 6, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: '/earlygame/ship_turret_00', count: 4 },
      { shipId: '/earlygame/ship_miniturret_00', count: 8 },
      { shipId: '/earlygame/ship_rammerspear_00', count: 4, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES },
    ],
    // incidents: [
    //   {
    //     spawnChance: 1.0,
    //     script: 'BlackHoleIncident',
    //     options: {
    //       x: 0,
    //       y: 0,
    //     },
    //     label: 'Black Hole',
    //   },
    // ],
  },
  {
    id: 2,
    type: 'wave',
    mods: ['extra-aggressive'],
    ships: [
      { shipId: 'wave_0_02', count: 16, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'wave_0_03', count: 16, affixes: SPEED_DEMON_AFFIXES },
      { shipId: '/earlygame/ship_turret_00', count: 10 },
      { shipId: '/earlygame/ship_miniturret_00', count: 8 },
      { shipId: '/earlygame/ship_rammerspear_00', count: 6, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES },
      { shipId: '/earlygame/ship_rammerhead_00', count: 2, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES },
      { shipId: '/earlygame/ship_dragonfly_00', count: 8, hunter: true },
      { shipId: '/earlygame/ship_minifly_00', count: 12, hunter: true },
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
      { shipId: '/earlygame/ship_rammerspear_00', count: 10, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES },
      { shipId: '/earlygame/ship_rammerhead_00', count: 4, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES },
      { shipId: '/earlygame/ship_dragonfly_00', count: 10, hunter: true },
      { shipId: '/earlygame/ship_minifly_00', count: 12, hunter: true },
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