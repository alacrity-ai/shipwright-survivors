// src/game/spatialbodies/interfaces/AtlasInfo.ts

// pseudo-structure managed by SpatialBodyRegistry
export interface AtlasInfo {
  atlasPath: string;
  atlasIndex: number;
  texture: WebGLTexture | null;
}
