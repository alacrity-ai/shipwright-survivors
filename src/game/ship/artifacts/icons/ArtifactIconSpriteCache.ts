// src/game/ship/artifacts/icons/ArtifactIconSpriteCache.ts

import { loadImage } from '@/shared/imageCache';

const FALLBACK_PATH = 'assets/artifacts/fallback.png';

const resolvedCache: Map<string, HTMLImageElement> = new Map();

/**
 * Loads an artifact icon by its icon key.
 * Uses `loadImage` under the hood (which caches results).
 * 
 * @param iconKey e.g. 'artifact_0_3'
 * @returns Promise<HTMLImageElement>
 */
export async function getArtifactIconSprite(iconKey: string): Promise<HTMLImageElement> {
  if (resolvedCache.has(iconKey)) {
    return resolvedCache.get(iconKey)!;
  }

  try {
    const img = await loadImage(`assets/artifacts/${iconKey}.png`);
    resolvedCache.set(iconKey, img);
    return img;
  } catch (err) {
    console.warn(`[ArtifactIconSpriteCache] Failed to load icon: ${iconKey}, falling back.`);
    const fallback = await loadImage(FALLBACK_PATH);
    resolvedCache.set(iconKey, fallback);
    return fallback;
  }
}

/**
 * Clears the artifact icon sprite cache.
 */
export function destroyArtifactIconSpriteCache(): void {
  resolvedCache.clear();
}
