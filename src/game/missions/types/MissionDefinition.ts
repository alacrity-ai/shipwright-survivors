// src/game/missions/MissionDefinition.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { MusicTrack } from '@/audio/AudioManager';
import type { FlagKey } from '@/game/player/registry/FlagRegistry';
import type { SpatialBodySpawnConfig } from '@/game/spatialbodies/interfaces/SpatialBodySpawnConfig';
import type { CloudRegion } from '@/game/veil/interfaces/CloudRegion';
import type { CloudRegionGenerationOptions } from '@/game/veil/interfaces/CloudRegionGenerationOptions';

export type PlanetSpawnConfig = {
  name: string;
  x: number;
  y: number;
};

export interface MissionDefinition {
  id: string;
  name: string;
  missionTitle: string;
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
  spatialBodies?: SpatialBodySpawnConfig[];
  cloudRegions?: CloudRegion[];
  autoGenerateCloudParams?: CloudRegionGenerationOptions;
  bonusObjectives?: string[];
  passiveReward?: number;
  music?: MusicTrack;
  bossMusic?: MusicTrack;
  dialogue?: string;
  enemyPower?: number;
  waveDensity?: number;
  sceneLighting?: SceneLightingRGBA;
  requiredFlag?: FlagKey; // Flag required to enter this mission
  missionPortrait?: string | null;
  onStart?: () => void;
  bossQuestId?: string; // Quest ID for the boss of this mission
}

export type SceneLightingRGBA = [number, number, number, number];
