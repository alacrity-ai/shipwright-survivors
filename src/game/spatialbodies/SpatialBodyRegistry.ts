// src/game/spatialbodies/SpatialBodyRegistry.ts
import type { SpatialBodyDefinition } from '@/game/spatialbodies/interfaces/SpatialBodyDefinition';
import { loadImage } from '@/shared/imageCache';
import { getAssetPath } from '@/shared/assetHelpers';
import { AtlasInfo } from '@/game/spatialbodies/interfaces/AtlasInfo';

// === Import all Spatial Body Definitions ===
import {
  iceAsteroid00,
  iceAsteroid01,
  iceAsteroid02,
  iceAsteroid03,
  iceAsteroid04,
} from '@/game/spatialbodies/definitions/iceDefinitions';

import {
  crystalSlice1,
  crystalSlice2,
  crystalSlice3,
  crystalSlice4,
  crystalSlice5,
} from '@/game/spatialbodies/definitions/crystalDefinitions';

import {
  alienSlice1,
  alienSlice2,
  alienSlice3,
  alienSlice4,
  alienSlice5,
  alienSlice6,
} from '@/game/spatialbodies/definitions/alienDefinitions';

// Internal maps
const bodyMap: Map<string, SpatialBodyDefinition> = new Map();

const atlases: AtlasInfo[] = [];

/**
 * Ensures an atlas entry exists for the given path, assigning an index if new.
 */
function ensureAtlas(path: string): number {
  const existing = atlases.find((a) => a.atlasPath === path);
  if (existing) return existing.atlasIndex;

  const index = atlases.length;
  atlases.push({ atlasPath: path, atlasIndex: index, texture: null });
  return index;
}

/**
 * Loads the texture for a specific atlas if not already loaded.
 * Returns the WebGLTexture handle (or null if not yet initialized).
 */
async function loadAtlasTexture(gl: WebGL2RenderingContext, atlasIndex: number): Promise<WebGLTexture> {
  const atlas = atlases[atlasIndex];
  if (!atlas) throw new Error(`Invalid atlas index: ${atlasIndex}`);

  if (atlas.texture) return atlas.texture;

  const img = await loadImage(getAssetPath(atlas.atlasPath));
  const texture = gl.createTexture();
  if (!texture) throw new Error(`Failed to create WebGLTexture for ${atlas.atlasPath}`);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

  atlas.texture = texture;
  console.log(`[SpatialBodyRegistry] Loaded atlas texture for ${atlas.atlasPath} and assigned to index: ${atlas.atlasIndex}`);
  return texture;
}

/**
 * Registers a spatial body definition with its atlas assignment.
 * Always resolves atlas index from the provided atlasPath to avoid
 * mismatches with hardcoded indices inside definitions.
 */
function registerBody(def: SpatialBodyDefinition, atlasPath: string): void {
  if (bodyMap.has(def.name)) {
    throw new Error(`Duplicate spatial body registration: ${def.name}`);
  }

  // Always assign atlasIndex from path to guarantee correctness
  def.atlasIndex = ensureAtlas(atlasPath);

  bodyMap.set(def.name, def);
}

// === Register all ice asteroids (all share the same atlas) ===
const iceAtlasPath = 'assets/spatialbodies/ice/atlas.png';
registerBody(iceAsteroid00, iceAtlasPath);
registerBody(iceAsteroid01, iceAtlasPath);
registerBody(iceAsteroid02, iceAtlasPath);
registerBody(iceAsteroid03, iceAtlasPath);
registerBody(iceAsteroid04, iceAtlasPath);

// === Register all crystal slices (shared atlas) ===
const crystalAtlasPath = 'assets/spatialbodies/crystal/atlas.png';
registerBody(crystalSlice1, crystalAtlasPath);
registerBody(crystalSlice2, crystalAtlasPath);
registerBody(crystalSlice3, crystalAtlasPath);
registerBody(crystalSlice4, crystalAtlasPath);
registerBody(crystalSlice5, crystalAtlasPath);

// === Register all alien slices (shared atlas) ===
const alienAtlasPath = 'assets/spatialbodies/alien/atlas.png';
registerBody(alienSlice1, alienAtlasPath);
registerBody(alienSlice2, alienAtlasPath);
registerBody(alienSlice3, alienAtlasPath);
registerBody(alienSlice4, alienAtlasPath);
registerBody(alienSlice5, alienAtlasPath);
registerBody(alienSlice6, alienAtlasPath);

// Public API
export const SpatialBodyRegistry = {
  getByName(name: string): SpatialBodyDefinition {
    const def = bodyMap.get(name);
    if (!def) {
      throw new Error(`Spatial body "${name}" not found in registry`);
    }
    return def;
  },

  getAll(): SpatialBodyDefinition[] {
    return Array.from(bodyMap.values());
  },

  getAtlasCount(): number {
    return atlases.length;
  },

  getAtlasTexture(gl: WebGL2RenderingContext, atlasIndex: number): Promise<WebGLTexture> {
    return loadAtlasTexture(gl, atlasIndex);
  },
};
