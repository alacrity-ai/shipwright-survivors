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

  /**
   * Optional script or trigger to run when ALL of this group’s ships are destroyed.
   * Could call e.g. `progressToNextWave()` or `endMission()`.
   */
  onAllDefeated?: string;
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

interface WaveIncidentEntry {
  spawnChance: number;
  script: string;
  options?: Record<string, any>;
  label?: string;
  delaySeconds?: number;
}

interface waveLightingSettings {
  clearColor?: [number, number, number, number];
}

export interface FormationShipSpec {
  shipId: string;
  hunter?: boolean;
  behaviorProfile?: BehaviorProfile; // Optional override
  offset?: { x: number; y: number }; // Optional override if not using layout index
  affixes?: ShipAffixes; // Optional ship affixes override
}

export type FormationLayout = { x: number; y: number }[]; // Index-aligned to followers[]

export interface WaveDefinition {
  mods: string[];
  ships: WaveShipEntry[];
  incidents?: WaveIncidentEntry[];
  formations?: ShipFormationEntry[];
  music?: MusicTrack;
  lightingSettings?: waveLightingSettings;
  duration?: number; // undefined or Infinity means never auto-advance
  spawnDistribution: 'at' | 'random' | 'outer' | 'inner' | 'aroundPlayer' | 'aroundPlayerNear' | 'center';
  atCoords?: { x: number; y: number; spreadRadius?: number };
  isBoss?: boolean;

  /**
   * If true, this wave uses a *quota maintenance model*.
   * Instead of spawning once, enemies are continuously replenished offscreen to maintain counts.
   */
  sustainMode?: boolean;

  /**
   * Interval (in seconds) at which to re-evaluate quotas and spawn missing units.
   * Only used when `sustainMode` is true.
   * Defaults to 2 seconds if omitted.
   */
  spawnDelay?: number;
}

