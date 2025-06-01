// src/game/missions/MissionRegistry.ts

import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
import { waveDefinitions as waveSet1 } from '@/game/waves/missions/Mission1Waves';
import { waveDefinitions as waveSet2 } from '@/game/waves/missions/Mission2Waves';

export const missionRegistry: Record<string, MissionDefinition> = {
  mission_001: {
    id: 'mission_001',
    name: 'Scrapfield Gauntlet',
    waves: waveSet1,
    environmentSettings: {
      backgroundId: 'background_4_00.png',
      gravity: 0,
    },
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 2
  },
  mission_002: {
    id: 'mission_002',
    name: 'The Scrapyard Shift',
    waves: waveSet2,
    environmentSettings: {
      backgroundId: 'background_5_00.png',
      gravity: 0,
    },
    bonusObjectives: ['No damage taken', 'Destroy all enemies in under 5 minutes'],
    passiveReward: 2
  }
};
