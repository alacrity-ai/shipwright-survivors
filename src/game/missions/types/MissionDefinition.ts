// src/game/missions/MissionDefinition.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';

export interface MissionDefinition {
  id: string;
  name: string;
  waves: WaveDefinition[];
  environmentSettings?: {
    backgroundId?: string;
    gravity?: number;
    fogDensity?: number;
  };
  bonusObjectives?: string[];
  passiveReward?: number;
}
