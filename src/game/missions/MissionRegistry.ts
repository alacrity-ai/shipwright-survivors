// src/game/missions/MissionRegistry.ts

import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
import { waveDefinitions as waveSet1 } from '@/game/waves/missions/Mission1Waves';
import { waveDefinitions as waveSet2 } from '@/game/waves/missions/Mission2Waves';
import { waveDefinitions as waveSet3 } from '@/game/waves/missions/Mission3Waves';

export const missionRegistry: Record<string, MissionDefinition> = {
  mission_001: {
    id: 'mission_001',
    name: 'Shipwright Second-Class',
    dialogue: 'intro-briefing',
    waves: waveSet1,
    dropMultiplier: 1.5,
    environmentSettings: {
      backgroundId: 'background_4_00.png',
      gravity: 0,
      worldWidth: 24000,
      worldHeight: 24000,
    },
    music: {
      file: 'assets/sounds/music/track_02_mission1.mp3',
    },
    enemyPower: 0.5,
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 1,
    requiredFlag: 'mission.mission_001.unlocked',
    missionPortrait: null,
  },
  mission_002: {
    id: 'mission_002',
    name: 'Starfield Gauntlet',
    dialogue: 'mission-generic',
    waves: waveSet1,
    dropMultiplier: 1.5,
    environmentSettings: {
      backgroundId: 'background_4_00.png',
      gravity: 0,
      worldWidth: 24000,
      worldHeight: 24000,
    },
    music: {
      file: 'assets/sounds/music/track_02_mission1.mp3',
    },
    enemyPower: 1,
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 1,
    requiredFlag: 'mission.mission_002.unlocked',
    missionPortrait: 'assets/characters/bosses/character_boss_wildjoe.png'
  },
  mission_003_00: {
    id: 'mission_003_00',
    name: 'The Scrapyard Revenant',
    dialogue: 'mission_003_00',
    waves: waveSet2,
    dropMultiplier: 1.5,
    environmentSettings: {
      backgroundId: 'background_9_00.png',
      gravity: 0,
      worldWidth: 9000,
      worldHeight: 9000,
    },
    planets: [
      { name: 'Ferrust', x: -3000, y: 4000 },
      { name: 'Gilipe', x: 9000, y: -4000 },
    ],
    enemyPower: 0.25,
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
    waves: waveSet3,
    dropMultiplier: 1.5,
    environmentSettings: {
      backgroundId: 'background_11_00.png',
      gravity: 0,
      worldWidth: 28000,
      worldHeight: 28000,
    },
    planets: [
      { name: 'Arsea', x: 6000, y: 4000 },
    ],
    enemyPower: 0.25,
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
