// src/game/waves/io/loaders.ts
import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { WavesFileJSON } from './WaveJSON';
import { loadWavesFromJSON } from './serde';
import { getAssetPath } from '@/shared/assetHelpers';

export async function loadWavesFromUrl(url: string): Promise<WaveDefinition[]> {
  const finalUrl = getAssetPath(url);
  const res = await fetch(finalUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch waves file: ${finalUrl}`);
  const raw = (await res.json()) as WavesFileJSON;
  return loadWavesFromJSON(raw);
}

