// src/game/missions/MissionRegistry.ts

import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
import { waveDefinitions as waveSet1 } from '@/game/waves/missions/Mission1Waves';
import { waveDefinitions as waveSet2 } from '@/game/waves/missions/Mission2Waves';

export const missionRegistry: Record<string, MissionDefinition> = {
  mission_001: {
    id: 'mission_001',
    name: 'Shipwright Second-Class',
    dialogue: 'intro-briefing',
    waves: waveSet1,
    environmentSettings: {
      backgroundId: 'background_4_00.png',
      gravity: 0,
    },
    music: {
      file: 'assets/sounds/music/track_02_mission1.mp3'
    },
    enemyPower: 1,
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 1
  },
  mission_002: {
    id: 'mission_002',
    name: 'Starfield Gauntlet',
    dialogue: 'mission-generic',
    waves: waveSet1,
    environmentSettings: {
      backgroundId: 'background_4_00.png',
      gravity: 0,
    },
    music: {
      file: 'assets/sounds/music/track_02_mission1.mp3'
    },
    enemyPower: 1,
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 1
  },
  mission_003: {
    id: 'mission_003',
    name: 'The Scrapyard Revenant',
    dialogue: 'mission-generic',
    waves: waveSet2,
    environmentSettings: {
      backgroundId: 'background_9_00.png',
      gravity: 0,
    },
    planets: [
      { name: 'Aetherion', x: -3000, y: 4000 },
      { name: 'Gilipe', x: 9000, y: -4000 },
    ],
    enemyPower: 0.5,
    music: {
      file: 'assets/sounds/music/track_09_junkyard.mp3'
    },
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 1
  }
};
