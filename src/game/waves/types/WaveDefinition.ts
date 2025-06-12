// src/game/waves/types/WaveDefinition.ts

import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';
import type { MusicTrack } from '@/audio/AudioManager';

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

interface waveLightingSettings {
  clearColor?: [number, number, number, number];
}

export interface WaveDefinition {
  id: number;
  type: 'wave' | 'boss' | string;
  mods: string[];
  ships: WaveShipEntry[];
  incidents?: WaveIncidentEntry[];
  waveDurationSeconds?: number;
  music?: MusicTrack;
  lightingSettings?: waveLightingSettings;
}
