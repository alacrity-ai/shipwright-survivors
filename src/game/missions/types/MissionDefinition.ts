// src/game/missions/MissionDefinition.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { MusicTrack } from '@/audio/AudioManager';
import type { FlagKey } from '@/game/player/registry/FlagRegistry';

export type PlanetSpawnConfig = {
  name: string;
  x: number;
  y: number;
};

export interface MissionDefinition {
  id: string;
  name: string;
  waves: WaveDefinition[];
  dropMultiplier?: number; // Multiplier for block drop rate
  environmentSettings?: {
    backgroundId?: string;
    gravity?: number;
    fogDensity?: number;
    worldWidth?: number;
    worldHeight?: number;
  };
  planets?: PlanetSpawnConfig[];
  bonusObjectives?: string[];
  passiveReward?: number;
  music?: MusicTrack;
  bossMusic?: MusicTrack;
  dialogue?: string;
  enemyPower?: number;
  sceneLighting?: SceneLightingRGBA;
  requiredFlag: FlagKey; // Flag required to enter this mission
  missionPortrait?: string | null;
}

export type SceneLightingRGBA = [number, number, number, number];
