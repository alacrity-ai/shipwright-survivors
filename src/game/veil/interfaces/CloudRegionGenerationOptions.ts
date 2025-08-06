// src/game/veil/interfaces/CloudRegionGenerationOptions.ts

import type { CloudParams } from '@/game/veil/interfaces/CloudRegion';
import type { MutationOptions } from '@/game/veil/interfaces/MutationOptions';
import type { BossOptions } from '@/game/veil/interfaces/BossOptions';

export interface CloudRegionGenerationOptions {
  worldWidth: number;
  worldHeight: number;
  minDistanceFromCenter: number;
  minRegionSpacing: number;
  radiusRange: [number, number];
  regionCountRange: [number, number];
  frontParams: CloudParams;
  backParams: CloudParams;
  mutationOptions?: MutationOptions;
  bossOptions?: BossOptions;
}
