// src/rendering/unified/interfaces/SpriteRenderRequest.ts

export interface SpriteRenderRequest {
  texture: WebGLTexture;
  worldX: number;
  worldY: number;
  widthPx: number;
  heightPx: number;
  alpha?: number;
}
