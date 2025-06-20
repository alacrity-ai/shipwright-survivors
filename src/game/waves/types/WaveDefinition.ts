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

export interface ShipFormationEntry {
  formationId: string; // Used for formation registry
  layout: FormationLayout; // Array of offsets
  leader: FormationShipSpec;
  followers: FormationShipSpec[];
  count?: number;
  leaderIsHunter?: boolean;
  unCullable?: boolean;
}

export interface FormationShipSpec {
  shipId: string;
  hunter?: boolean;
  behaviorProfile?: string; // Optional override
  offset?: { x: number; y: number }; // Optional override if not using layout index
  affixes?: ShipAffixes; // Optional ship affixes override
}

export type FormationLayout = { x: number; y: number }[]; // Index-aligned to followers[]

export interface WaveDefinition {
  id: number;
  type: 'wave' | 'boss' | string;
  mods: string[];
  ships: WaveShipEntry[];
  incidents?: WaveIncidentEntry[];
  formations?: ShipFormationEntry[];
  music?: MusicTrack;
  lightingSettings?: waveLightingSettings;
  duration?: number; // NEW!
}
