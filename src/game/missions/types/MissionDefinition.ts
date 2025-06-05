// src/game/missions/MissionDefinition.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { MusicTrack } from '@/audio/AudioManager';

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
  music?: MusicTrack;
  dialogue?: string;
  enemyPower?: number; // Multiplier for enemy stats, 1 is normal, 0.5 is half power, 2 is double, etc.
}
