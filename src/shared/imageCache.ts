// src/shared/imageCache.ts

import { getAssetPath } from '@/shared/assetHelpers';

const imageCache = new Map<string, HTMLImageElement>();

/**
 * Loads and caches an image using `getAssetPath` to resolve the full URL.
 * @param relativePath Path relative to `public/assets`, e.g. 'assets/title_screen.png'
 */
export async function loadImage(relativePath: string): Promise<HTMLImageElement> {
  const resolvedPath = getAssetPath(relativePath);

  if (imageCache.has(resolvedPath)) {
    return imageCache.get(resolvedPath)!;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = resolvedPath;
    img.onload = () => {
      imageCache.set(resolvedPath, img);
      resolve(img);
    };
    img.onerror = reject;
  });
}

/**
 * Clears all cached image instances.
 */
export function clearImageCache(): void {
  imageCache.clear();
}
