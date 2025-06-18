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
      { shipId: 'wave_0_02', count: 34 },
      { shipId: 'wave_0_03', count: 22 },
      { shipId: 'wave_0_04', count: 32 },
      { shipId: '/earlygame/ship_rammerspear_00', count: 4, hunter: true, behaviorProfile: RammingBehaviorProfile, affixes: RAMMER_SPEAR_AFFIXES },
      { shipId: 'mission_03/haloblade_pod_00', count: 12},
      { shipId: 'mission_03/haloblade_pod_01', count: 8},
      { shipId: 'mission_03/haloblade_pod_mini_00', count: 10 },
      { shipId: 'mission_03/haloblade_speeder_00', count: 4 },
      { shipId: 'mission_03/haloblade_beatle_00', count: 2 },
      { shipId: 'mission_03/haloblade_beatle_01', count: 4 },
      { shipId: 'mission_03/lance_miner_00', count: 8 },
      { shipId: 'mission_03/lance_miner_00', count: 2, hunter: true },
      { shipId: 'mission_03/lance_miner_station_00', count: 4 },
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
    mods: [],
    ships: [
      { shipId: 'wave_0_02', count: 16, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'wave_0_03', count: 16, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'mission_03/haloblade_pod_00', count: 12},
      { shipId: 'mission_03/haloblade_pod_01', count: 8},
      { shipId: 'mission_03/haloblade_pod_mini_00', count: 12 },
      { shipId: 'mission_03/haloblade_speeder_00', count: 4, hunter: true },
      { shipId: 'mission_03/haloblade_beetle_00', count: 4, hunter: true },
      { shipId: 'mission_03/lance_miner_00', count: 2 },
      { shipId: 'mission_03/lance_miner_station_00', count: 4 },
      { shipId: 'mission_03/lance_miner_station_01', count: 4 },
      { shipId: 'mission_03/haloblade_cruiser_00', count: 2 },
      { shipId: 'mission_03/haloblade_minicruiser_00', count: 2 },
      { shipId: 'mission_03/haloblade_minicruiser_00', count: 6 },
      { shipId: 'mission_03/lance_miner_00', count: 12 }
    ]
  },
  {
    id: 3,
    type: 'wave',
    mods: [],
    ships: [
      { shipId: 'mission_03/haloblade_minicruiser_00', count: 4},
      { shipId: 'mission_03/haloblade_cruiser_00', count: 6},
      { shipId: 'mission_03/horrorhunter_00', count: 4, hunter: true },
      { shipId: 'mission_03/horror_station_00', count: 2 },
      { shipId: 'mission_03/horrorhunter_01', count: 2, hunter: true },
      { shipId: 'mission_03/horrorhunter_02', count: 2, hunter: true },
      { shipId: 'mission_03/horrorhunter_00', count: 6 },
      { shipId: 'mission_03/horrorhunter_01', count: 6 },
      { shipId: 'mission_03/horrorhunter_02', count: 6 },
      { shipId: 'mission_03/speedhunter_00', count: 4 },
      { shipId: 'mission_03/haloblade_cruiser_00', count: 4 },
    ]
  },
  {
    id: 4,
    type: 'wave',
    mods: [],
    ships: [
      { shipId: 'mission_03/haloblade_minicruiser_00', count: 4 },
      { shipId: 'mission_03/haloblade_cruiser_00', count: 6},
      { shipId: 'mission_03/horrorhunter_00', count: 10 },
      { shipId: 'mission_03/horror_station_00', count: 2 },
      { shipId: 'mission_03/horrorhunter_01', count: 4, hunter: true },
      { shipId: 'mission_03/horrorhunter_02', count: 4, hunter: true },
      { shipId: 'mission_03/speedhunter_00', count: 8 },
      { shipId: 'mission_03/haloblade_cruiser_00', count: 4, hunter: true },
    ]
  },
  {
    id: 5,
    type: 'wave',
    mods: [],
    ships: [
      { shipId: 'mission_03/haloblade_pod_00', count: 6},
      { shipId: 'mission_03/haloblade_pod_01', count: 4},
      { shipId: 'mission_03/haloblade_pod_mini_00', count: 9, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'mission_03/haloblade_speeder_00', count: 10, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'mission_03/haloblade_beetle_00', count: 12, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'mission_03/lance_miner_00', count: 4, hunter: true },
      { shipId: 'mission_03/lance_miner_station_00', count: 6 },
      { shipId: 'mission_03/lance_miner_station_01', count: 6 },
      { shipId: 'mission_03/haloblade_cruiser_00', count: 12, hunter: true, affixes: SPEED_DEMON_AFFIXES },
      { shipId: 'mission_03/haloblade_minicruiser_00', count: 14, hunter: true },
      { shipId: 'mission_03/haloblade_minicruiser_00', count: 16 },
      { shipId: 'mission_03/boss_03', count: 6 }
    ]
  },
  {
    id: 6,
    type: 'boss',
    mods: ['shielded', 'extra-aggressive'],
    ships: [
      { shipId: 'mission_03/boss_03', count: 1, hunter: true }
    ],
    music: {
      file: 'assets/sounds/music/track_03_boss.mp3',
    },
    lightingSettings: {
      clearColor: [0.0, 0.0, 0.0, 0.0]
    }
  }
];