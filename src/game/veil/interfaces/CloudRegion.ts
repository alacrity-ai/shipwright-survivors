// src/game/veil/interfaces/CloudRegion.ts

import type { MutationOptions } from '@/game/veil/interfaces/MutationOptions';
import type { BossOptions } from '@/game/veil/interfaces/BossOptions';

export type Vec2 = { x: number; y: number };

export type CloudParams = {
  speed?: number;
  density?: number;
  quantity?: number;
  scale?: number;
  alpha?: number;
  color?: [number, number, number];
};

export type CloudRegion = {
  id: string;
  center: Vec2;
  radius: number;
  frontParams: CloudParams;
  backParams: CloudParams;
  mutationOptions?: MutationOptions;
  bossOptions?: BossOptions;
};
