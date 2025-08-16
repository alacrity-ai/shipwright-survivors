// src/game/waves/io/resolveMissionWaves.ts
import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import { loadWavesFromUrl } from './loaders';

/**
 * Back-compatible resolver:
 * - If mission.wavesJsonPath exists → fetch & deserialize JSON
 * - Else fall back to mission.waves (inline)
 */
export async function resolveMissionWaves(mission: MissionDefinition): Promise<WaveDefinition[]> {
  if (mission.wavesJsonPath && mission.wavesJsonPath.trim().length > 0) {
    return loadWavesFromUrl(mission.wavesJsonPath);
  }
  // Defensive clone to avoid accidental mutation of design-time arrays:
  return JSON.parse(JSON.stringify(mission.waves)) as WaveDefinition[];
}

const cache = new Map<string, Promise<WaveDefinition[]>>();
export async function resolveMissionWavesCached(mission: MissionDefinition) {
  if (!mission.wavesJsonPath) return resolveMissionWaves(mission);
  if (!cache.has(mission.wavesJsonPath)) {
    cache.set(mission.wavesJsonPath, resolveMissionWaves(mission));
  }
  return cache.get(mission.wavesJsonPath)!;
}
