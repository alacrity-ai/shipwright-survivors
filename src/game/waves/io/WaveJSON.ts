// src/game/waves/io/WaveJSON.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';

export type AffixId = string;
export type BehaviorId = string;

export interface BehaviorJSON {
  /** Engine preset identifier understood by BehaviorRegistry (e.g., "siege"). */
  preset: string;
  /** Applied as a deep-merge delta onto the preset. */
  params?: Record<string, any>;
}

export interface WaveShipEntryJSON {
  shipId: string;
  count: number;
  hunter?: boolean;
  noClip?: boolean;
  onAllDefeated?: string;

  // Affixes: either ref or inline literal
  affixesRef?: AffixId;
  affixes?: import('@/game/interfaces/types/ShipAffixes').ShipAffixes;

  // Behavior: either ref or inline literal
  behaviorRef?: BehaviorId;
  behavior?: BehaviorJSON;
}

export interface WaveIncidentEntryJSON {
  spawnChance: number;
  script: string;
  options?: Record<string, any>;
  label?: string;
  delaySeconds?: number;
}

export interface ShipFormationEntryJSON extends ShipFormationEntry {}

export interface WaveJSON {
  mods: string[];
  ships: WaveShipEntryJSON[];
  incidents?: WaveIncidentEntryJSON[];
  formations?: ShipFormationEntryJSON[];
  music?: import('@/audio/AudioManager').MusicTrack;
  lightingSettings?: { clearColor?: [number, number, number, number] };
  duration?: number | "Infinity";
  spawnDistribution: 'at'|'random'|'outer'|'inner'|'aroundPlayer'|'aroundPlayerNear'|'center';
  atCoords?: { x: number; y: number; spreadRadius?: number };
  isBoss?: boolean;
  sustainMode?: boolean;
  spawnDelay?: number;
}

export interface WavesFileJSON {
  version: 1;
  affixes?: Record<AffixId, import('@/game/interfaces/types/ShipAffixes').ShipAffixes>;
  behaviors?: Record<BehaviorId, BehaviorJSON>;
  waves: WaveJSON[];
}
