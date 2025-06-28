// src/rendering/cache/PickupSpriteCache.ts

import { createGL2TextureFromCanvas } from '@/rendering/gl/glTextureUtils';
import { drawQuantumAttractor } from '@/rendering/cache/helpers/drawQuantumAttractor';

export interface PickupSprite {
  canvas: HTMLCanvasElement;
}

export interface GLPickupSprite {
  texture: WebGLTexture;
}

const PICKUP_SIZE = 32;

const spriteCache: Map<string, PickupSprite> = new Map();
const glSpriteCache: Map<string, GLPickupSprite> = new Map();

// --- Sprite ID Registry ---

function getAllPickupTypes(): string[] {
  return ['currency', 'repair', 'quantumAttractor'];
}

// --- Canvas Setup ---

function createBlankCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = PICKUP_SIZE;
  canvas.height = PICKUP_SIZE;
  const ctx = canvas.getContext('2d', { alpha: true })!;
  return { canvas, ctx };
}

// --- Drawing Logic ---

function drawProceduralPickup(typeId: string): void {
  if (typeId === 'quantumAttractor') {
    const canvas = drawQuantumAttractor();
    spriteCache.set(typeId, { canvas });
    return;
  }

  const { canvas, ctx } = createBlankCanvas();
  const center = PICKUP_SIZE / 2;

  ctx.clearRect(0, 0, PICKUP_SIZE, PICKUP_SIZE);

  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);

  switch (typeId) {
    case 'currency':
      gradient.addColorStop(0.0, '#ffcc00');
      gradient.addColorStop(0.6, '#ffaa00');
      gradient.addColorStop(1.0, '#cc6600');
      break;
    case 'repair':
      gradient.addColorStop(0.0, '#ff6666');
      gradient.addColorStop(0.7, '#cc2222');
      gradient.addColorStop(1.0, '#880000');
      break;
    default:
      console.warn(`[PickupSpriteCache] Unknown pickup type: ${typeId}`);
      break;
  }

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center, center, center, 0, Math.PI * 2);
  ctx.fill();

  spriteCache.set(typeId, { canvas });
}

// --- Initialization ---

export function initializePickupSpriteCache(): void {
  for (const id of getAllPickupTypes()) {
    drawProceduralPickup(id);
  }
}

export function initializeGLPickupSpriteCache(gl: WebGL2RenderingContext): void {
  let count = 0;
  for (const [typeId, sprite] of spriteCache.entries()) {
    try {
      const texture = createGL2TextureFromCanvas(gl, sprite.canvas);
      glSpriteCache.set(typeId, { texture });
      count++;
    } catch (e) {
      console.error(`[GLPickupSpriteCache] Failed to create texture for ${typeId}:`, e);
    }
  }
  console.log(`[GLPickupSpriteCache] Initialized ${count} GL2 pickup textures.`);
}

// --- Cleanup ---

export function destroyGLPickupSpriteCache(gl: WebGL2RenderingContext): void {
  for (const { texture } of glSpriteCache.values()) {
    if (texture && gl.isTexture(texture)) {
      gl.deleteTexture(texture);
    }
  }
  glSpriteCache.clear();
}

// --- Accessors ---

export function getPickupSprite(typeId: string): PickupSprite {
  const sprite = spriteCache.get(typeId);
  if (!sprite) throw new Error(`Pickup sprite not cached: ${typeId}`);
  return sprite;
}

export function getGLPickupSprite(typeId: string): GLPickupSprite {
  const sprite = glSpriteCache.get(typeId);
  if (!sprite) throw new Error(`GL pickup sprite not cached: ${typeId}`);
  return sprite;
}
