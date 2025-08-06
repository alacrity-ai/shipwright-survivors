// src/game/missions/MissionRegistry.ts

import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';

// Hud 
import { emitHudHideAll } from '@/core/interfaces/events/HudReporter';

// Cloud Registry
import { CloudRegionRegistry } from '@/game/veil/CloudRegistry';
import { MISSION_02_CLOUDS } from '@/game/veil/prefabs/defaultParams';

// Enemy Wave imports
import { waveDefinitions as titleScreenWaves } from '@/game/waves/missions/TitleScreenWaves';
import { waveDefinitions as waveSet0 } from '@/game/waves/missions/Mission0Waves';
import { waveDefinitions as waveSet1 } from '@/game/waves/missions/Mission1Waves';
import { waveDefinitions as waveSet2 } from '@/game/waves/missions/Mission2Waves';
import { waveDefinitions as waveSet3 } from '@/game/waves/missions/Mission3Waves';
import { waveDefinitions as waveSet4 } from '@/game/waves/missions/Mission4Waves';

// Spatial Body imports
import { iceSpatialBodyConfig } from '@/game/spatialbodies/configs/iceConfig';

import { flags } from '@/game/player/PlayerFlagManager';
import { FlagKey } from '../player/registry/FlagRegistry';


export const missionRegistry: Record<string, MissionDefinition> = {
  mission_editor: {
    id: 'mission_editor',
    name: 'Editor',
    missionTitle: 'Editor',
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
  titlescreen: {
    id: 'titlescreen',
    name: 'Title Screen',
    missionTitle: 'Title Screen',
    waves: titleScreenWaves,
    dropMultiplier: 2.0,
    environmentSettings: {
      backgroundId: 'background_10_00.png',
      gravity: 0,
      worldWidth: 9000,
      worldHeight: 9000,
    },
    // music: {
    //   file: 'assets/sounds/music/track_02_mission1.mp3',
    // },
    enemyPower: 1,
    waveDensity: 1,
    missionPortrait: null,
    planets: [
      { name: 'Ferrust', x: -2600, y: 3000 },
      { name: 'Gilipe', x: 3400, y: -2000 },
    ],
    // onStart: () => {
    //   emitHudHideAll();
    // },
  },
  mission_001: {
    id: 'mission_001',
    name: 'Shipwright Second Class',
    missionTitle: 'Training Mission',
    dialogue: 'intro-briefing',
    waves: waveSet0,
    dropMultiplier: 2.0,
    environmentSettings: {
      backgroundId: 'background_4_00.png',
      gravity: 0,
      worldWidth: 16000,
      worldHeight: 16000,
    },
    music: {
      file: 'assets/sounds/music/track_02_mission1.mp3',
    },
    enemyPower: 0.25,
    waveDensity: 0.5,
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 1,
    requiredFlag: 'mission.mission_001.unlocked',
    missionPortrait: null,
    planets: [
      { name: 'Voidia', x: -5000, y: -6000 },
    ],
    onStart: () => {
      // Hide UI
      emitHudHideAll();
    },
  },
  mission_002: {
    id: 'mission_002',
    name: 'Starfield Gauntlet',
    missionTitle: 'Mission 1',
    dialogue: 'mission-generic',
    waves: waveSet1,
    dropMultiplier: 1.0,
    environmentSettings: {
      backgroundId: 'background_9_02.png',
      gravity: 0,
      worldWidth: 64000,
      worldHeight: 64000,
    },
    music: {
      file: 'assets/sounds/music/track_12_mission6.mp3',
    },
    enemyPower: 0.5,
    waveDensity: 0.5,
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 1,
    requiredFlag: 'mission.mission_002.unlocked',
    missionPortrait: 'assets/characters/bosses/character_boss_wildjoe.png',
    planets: [
      { name: 'Selk', x: 0, y: 0 },
      { name: 'Ferrust', x: -22600, y: 31000 },
      { name: 'Gilipe', x: 30400, y: -12000 },
      { name: 'Arsea', x: 10000, y: -20000 },
      { name: 'Deimos', x: -12000, y: -24000 }
    ],
    spatialBodies: iceSpatialBodyConfig,
    autoGenerateCloudParams: MISSION_02_CLOUDS,
  },
  mission_003_00: {
    id: 'mission_003_00',
    name: 'The Scrapyard Revenant',
    missionTitle: 'Mission 2',
    dialogue: 'mission_003_00',
    waves: waveSet2,
    dropMultiplier: 1.0,
    environmentSettings: {
      backgroundId: 'background_10_00.png',
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
    missionTitle: 'Mission 3',
    dialogue: 'mission-generic',
    waves: waveSet3,
    dropMultiplier: 1.5,
    environmentSettings: {
      backgroundId: 'background_12_01.png',
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
    missionTitle: 'Mission 4',
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
    missionTitle: 'Mission 5',
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

export function allPlanetsDiscoveredInMission(missionId: string): boolean {
  const mission = missionRegistry[missionId];
  if (!mission) return false;
  for (const { name: planetName } of mission.planets ?? []) {
    if (!flags.has(`planet.${planetName.toLowerCase()}.visited` as FlagKey)) return false;
  }
  return true;
}

export function getDiscoveredPlanetsInMission(missionId: string): string[] {
  const mission = missionRegistry[missionId];
  if (!mission) return [];
  return (mission.planets ?? []).filter(p => flags.has(`planet.${p.name.toLowerCase()}.visited` as FlagKey)).map(p => p.name);
}
