// src/rendering/ProjectileSpriteCache.ts

import { drawEnergyRing } from '@/rendering/helpers/drawEnergyRing';
import { createTextureFromCanvasWithAlpha } from '@/rendering/gl/glTextureUtils';

// --- Sprite Interfaces ---

export interface ProjectileSprite {
  canvas: HTMLCanvasElement;
}

export interface GLProjectileSprite {
  texture: WebGLTexture;
}

const CANVAS_SIZE = 128;
const spriteCache: Map<string, ProjectileSprite> = new Map();
const glSpriteCache: Map<string, GLProjectileSprite> = new Map();

// --- Helpers ---

function getAllProjectileTypes(): string[] {
  return [
    'energyRing0',
    'energyRing1',
    'energyRing2',
    'energyRing3',
    'energyRing4',
  ];
}

function createBlankCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  // MUST pass options here
  const ctx = canvas.getContext('2d', { alpha: true })!;
  return { canvas, ctx };
}

// --- Drawing ---

function drawProceduralProjectile(typeId: string): void {
  const { canvas, ctx } = createBlankCanvas();
  const center = CANVAS_SIZE / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (typeId) {
    case 'energyRing0':
    case 'energyRing1':
      drawEnergyRing(ctx, center, center, 64, '#FFBF00');
      break;
    case 'energyRing2':
      drawEnergyRing(ctx, center, center, 64, '#2CFF05');
      break;
    case 'energyRing3':
      drawEnergyRing(ctx, center, center, 64, '#00FFFF');
      break;
    case 'energyRing4':
      drawEnergyRing(ctx, center, center, 64, '#7F00FF');
      break;
    default:
      console.warn(`[ProjectileSpriteCache] Unknown projectile type: ${typeId}`);
      break;
  }

  spriteCache.set(typeId, { canvas });
}

// --- Initialization ---

export function initializeGLProjectileSpriteCache(gl: WebGLRenderingContext): void {
  let count = 0;
  for (const [typeId, sprite] of spriteCache.entries()) {
    try {
      const texture = createTextureFromCanvasWithAlpha(gl, sprite.canvas);
      glSpriteCache.set(typeId, { texture });
      count++;
    } catch (e) {
      console.error(`[GLProjectileCache] Failed to convert ${typeId}`, e);
    }
  }
  console.log(`[GLProjectileCache] Initialized ${count} GL projectile textures.`);
}

export function initializeProjectileSpriteCache(): void {
  for (const id of getAllProjectileTypes()) {
    drawProceduralProjectile(id);
  }
}

// --- Cleanup ---

export function destroyGLProjectileSpriteCache(gl: WebGLRenderingContext): void {
  for (const { texture } of glSpriteCache.values()) {
    if (texture && gl.isTexture(texture)) {
      gl.deleteTexture(texture);
    }
  }
  glSpriteCache.clear();
}

// --- Accessors ---

export function getProjectileSprite(typeId: string): ProjectileSprite {
  const sprite = spriteCache.get(typeId);
  if (!sprite) throw new Error(`Projectile sprite not cached: ${typeId}`);
  return sprite;
}

export function getGLProjectileSprite(typeId: string): GLProjectileSprite {
  const sprite = glSpriteCache.get(typeId);
  if (!sprite) throw new Error(`GL projectile sprite not cached: ${typeId}`);
  return sprite;
}
