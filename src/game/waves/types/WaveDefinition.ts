// src/game/waves/types/WaveDefinition.ts

import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

export interface WaveShipEntry {
  shipId: string;
  count: number;
  hunter?: boolean;
  behaviorProfile?: BehaviorProfile;
  affixes?: ShipAffixes;
}

interface WaveIncidentEntry {
  spawnChance: number;
  script: string;
  options?: Record<string, any>;
  label?: string;
}

export interface WaveDefinition {
  id: number;
  type: 'wave' | 'boss' | string;
  mods: string[];
  ships: WaveShipEntry[];
  incidents?: WaveIncidentEntry[];
  waveDurationSeconds?: number;
}
