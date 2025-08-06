// src/game/veil/prefabs/defaultParams.ts

import type { CloudParams } from '@/game/veil/interfaces/CloudRegion';
import type { CloudRegionGenerationOptions } from '@/game/veil/interfaces/CloudRegionGenerationOptions';

export const DEFAULT_FRONT_PARAMS: CloudParams = {
  speed: 0.5,
  density: 1.2,
  quantity: 2.0,
  scale: 3.0,
  alpha: 0.14,
  color: [0.8, 0.6, 0.9],
};

export const DEFAULT_BACK_PARAMS: CloudParams = {
  speed: 0.5,
  density: 1.2,
  quantity: 2.0,
  scale: 1.0,
  alpha: 0.18,
  color: [0.2, 0.2, 0.8],
};

export const MISSION_02_CLOUDS: CloudRegionGenerationOptions = {
  worldWidth: 64000,
  worldHeight: 64000,
  minDistanceFromCenter: 25000,
  minRegionSpacing: 16000,
  radiusRange: [6000, 10000],
  regionCountRange: [2, 4],
  frontParams: DEFAULT_FRONT_PARAMS,
  backParams: DEFAULT_BACK_PARAMS,
  mutationOptions: {
    mutateShips: true,
    mutationBlockTier: 0,
    mutationBlockCount: [5, 25],
    mutationIntervalSeconds: 10,
    mutatedShipKillLimit: 10,
  },
  bossOptions: {
    bossId: 'veil/veil_boss_03',
    spawnChance: 1.0,
  },
}
