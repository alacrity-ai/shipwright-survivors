// src/game/waves/types/WaveDefinition.ts

import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

export interface WaveShipEntry {
  shipId: string;
  count: number;
  hunter?: boolean;
  behaviorProfile?: BehaviorProfile;
}

export interface WaveDefinition {
  id: number;
  type: 'wave' | 'boss' | string;
  mods: string[];
  ships: WaveShipEntry[];
}
