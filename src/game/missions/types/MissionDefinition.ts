// src/game/missions/MissionDefinition.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { MusicTrack } from '@/audio/AudioManager';

export type SceneLightingRGBA = [number, number, number, number];

export type PlanetSpawnConfig = {
  name: string;
  x: number;
  y: number;
};

export interface MissionDefinition {
  id: string;
  name: string;
  waves: WaveDefinition[];
  environmentSettings?: {
    backgroundId?: string;
    gravity?: number;
    fogDensity?: number;
  };
  planets?: PlanetSpawnConfig[]; // NEW
  bonusObjectives?: string[];
  passiveReward?: number;
  music?: MusicTrack;
  bossMusic?: MusicTrack;
  dialogue?: string;
  enemyPower?: number;
  sceneLighting?: SceneLightingRGBA;
}
