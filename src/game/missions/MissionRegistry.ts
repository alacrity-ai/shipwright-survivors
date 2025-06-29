// src/game/missions/MissionRegistry.ts

import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
import { waveDefinitions as waveSet0 } from '@/game/waves/missions/Mission0Waves';
import { waveDefinitions as waveSet1 } from '@/game/waves/missions/Mission1Waves';
import { waveDefinitions as waveSet2 } from '@/game/waves/missions/Mission2Waves';
import { waveDefinitions as waveSet3 } from '@/game/waves/missions/Mission3Waves';
import { waveDefinitions as waveSet4 } from '@/game/waves/missions/Mission4Waves';

export const missionRegistry: Record<string, MissionDefinition> = {
  mission_editor: {
    id: 'mission_editor',
    name: 'Editor',
    waves: [],
    dropMultiplier: 1.5,
    environmentSettings: {
      backgroundId: 'background_4_00.png',
      gravity: 0,
      worldWidth: 16000,
      worldHeight: 16000,
    },
    enemyPower: 1,
    waveDensity: 0.5,
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 0,
    missionPortrait: null,
    requiredFlag: 'mission.mission_001.unlocked',
    music: {
      file: null,
    }
  },
  mission_001: {
    id: 'mission_001',
    name: 'Shipwright Second-Class',
    dialogue: 'intro-briefing',
    waves: waveSet0,
    dropMultiplier: 1.0,
    environmentSettings: {
      backgroundId: 'background_4_00.png',
      gravity: 0,
      worldWidth: 16000,
      worldHeight: 16000,
    },
    music: {
      file: 'assets/sounds/music/track_02_mission1.mp3',
    },
    enemyPower: 0.5,
    waveDensity: 0.5,
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 1,
    requiredFlag: 'mission.mission_001.unlocked',
    missionPortrait: null,
    planets: [
      { name: 'Voidia', x: -5000, y: -6000 },
    ],
  },
  mission_002: {
    id: 'mission_002',
    name: 'Starfield Gauntlet',
    dialogue: 'mission-generic',
    waves: waveSet1,
    dropMultiplier: 1.0,
    environmentSettings: {
      backgroundId: 'background_4_00.png',
      gravity: 0,
      worldWidth: 16000,
      worldHeight: 16000,
    },
    music: {
      file: 'assets/sounds/music/track_02_mission1.mp3',
    },
    enemyPower: 0.5,
    waveDensity: 0.5,
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 1,
    requiredFlag: 'mission.mission_002.unlocked',
    missionPortrait: 'assets/characters/bosses/character_boss_wildjoe.png',
    planets: [
      { name: 'Voidia', x: -5000, y: -6000 },
    ],
  },
  mission_003_00: {
    id: 'mission_003_00',
    name: 'The Scrapyard Revenant',
    dialogue: 'mission_003_00',
    waves: waveSet2,
    dropMultiplier: 1.0,
    environmentSettings: {
      backgroundId: 'background_9_00.png',
      gravity: 0,
      worldWidth: 9000,
      worldHeight: 9000,
    },
    planets: [
      { name: 'Ferrust', x: -2600, y: 3000 },
      { name: 'Gilipe', x: 3400, y: -2000 },
    ],
    enemyPower: 0.5,
    waveDensity: 0.5,
    music: {
      file: 'assets/sounds/music/track_09_junkyard.mp3',
    },
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 1,
    sceneLighting: [0.0, 0.0, 0.0, 0.0],
    requiredFlag: 'mission.mission_003_00.unlocked',
    missionPortrait: 'assets/characters/bosses/character_boss_crusher-mae.png'
  },
  mission_004_00: {
    id: 'mission_004_00',
    name: 'The Miner\'s Dillemma',
    dialogue: 'mission-generic',
    waves: waveSet3,
    dropMultiplier: 1.5,
    environmentSettings: {
      backgroundId: 'background_10_00.png',
      gravity: 0,
      worldWidth: 28000,
      worldHeight: 28000,
    },
    planets: [
      { name: 'Arsea', x: 6000, y: 4000 },
    ],
    enemyPower: 0.25,
    waveDensity: 1,
    music: {
      file: 'assets/sounds/music/track_05_mission3.mp3',
    },
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 1,
    sceneLighting: [0.0, 0.0, 0.0, 0.0],
    requiredFlag: 'mission.mission_004_00.unlocked',
    missionPortrait: 'assets/characters/bosses/character_boss_executron-9b.png'
  },
  mission_005_00: {
    id: 'mission_005_00',
    name: 'WIP',
    dialogue: 'mission-generic',
    waves: waveSet4,
    dropMultiplier: 1.5,
    environmentSettings: {
      backgroundId: 'background_11_00.png',
      gravity: 0,
      worldWidth: 14000,
      worldHeight: 14000,
    },
    planets: [
      { name: 'Arsea', x: 6000, y: 4000 },
    ],
    enemyPower: 0.25,
    waveDensity: 1,
    music: {
      file: 'assets/sounds/music/track_05_mission3.mp3',
    },
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 1,
    sceneLighting: [0.0, 0.0, 0.0, 0.0],
    requiredFlag: 'mission.mission_005_00.unlocked',
    missionPortrait: 'assets/characters/bosses/character_boss_jackpot-vera.png'
  },
  mission_006_00: {
    id: 'mission_006_00',
    name: 'WIP',
    dialogue: 'mission-generic',
    waves: waveSet3,
    dropMultiplier: 1.5,
    environmentSettings: {
      backgroundId: 'background_5_00.png',
      gravity: 0,
      worldWidth: 28000,
      worldHeight: 28000,
    },
    planets: [
      { name: 'LargeSun', x: 3000, y: 2000 },
    ],
    enemyPower: 0.25,
    waveDensity: 1,
    music: {
      file: 'assets/sounds/music/track_05_mission3.mp3',
    },
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 1,
    sceneLighting: [0.0, 0.0, 0.0, 0.0],
    requiredFlag: 'mission.mission_006_00.unlocked',
    missionPortrait: 'assets/characters/bosses/character_boss_admiral-pith.png'
  }
};
