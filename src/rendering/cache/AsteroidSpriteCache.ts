// src/rendering/cache/AsteroidSpriteCache.ts

import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';
import { getAllAsteroidBlockTypes } from '@/game/blocks/AsteroidBlockRegistry';

import { drawRoundedRock } from '@/rendering/cache/asteroidBlockRenderers/roundedRockBlockRenderer';
import { drawRockBlock } from '@/rendering/cache/asteroidBlockRenderers/rockBlockRenderer';
import { 
  drawFacetRockBlock, 
  drawFacetRockAltBlock,
  drawFacetRockSlimBlock,
 } from '@/rendering/cache/asteroidBlockRenderers/facetRockBlockRenderer';

import { createGL2TextureFromCanvas } from '@/rendering/gl/glTextureUtils';

// --- Damage Level Enum ---

export enum AsteroidDamageLevel {
  NONE = 'none',
  FRACTURED = 'fractured',
  CRUMBLING = 'crumbling',
}

// --- Raster Interfaces ---

export interface AsteroidSprite {
  base: HTMLCanvasElement;
  overlay?: HTMLCanvasElement;
}

export interface DamagedAsteroidSprite {
  [AsteroidDamageLevel.NONE]: AsteroidSprite;
  [AsteroidDamageLevel.FRACTURED]: AsteroidSprite;
  [AsteroidDamageLevel.CRUMBLING]: AsteroidSprite;
}

// --- GL Interfaces ---

export interface GLAsteroidSprite {
  base: WebGLTexture;
  overlay?: WebGLTexture;
}

export interface GLDamagedAsteroidSprite {
  [AsteroidDamageLevel.NONE]: GLAsteroidSprite;
  [AsteroidDamageLevel.FRACTURED]: GLAsteroidSprite;
  [AsteroidDamageLevel.CRUMBLING]: GLAsteroidSprite;
}

// --- Internal Caches ---

const asteroidSpriteCache: Map<string, DamagedAsteroidSprite> = new Map();
const gl2AsteroidSpriteCache: Map<string, GLDamagedAsteroidSprite> = new Map();

// --- Canvas Helpers ---

function createBlankCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = BLOCK_SIZE;
  canvas.height = BLOCK_SIZE;
  return canvas;
}

function applyAsteroidDamageToCanvas(
  source: HTMLCanvasElement,
  level: AsteroidDamageLevel
): HTMLCanvasElement {
  if (level === AsteroidDamageLevel.NONE) return source;

  const damaged = createBlankCanvas();
  const ctx = damaged.getContext('2d')!;
  const tmp = createBlankCanvas();
  const tmpCtx = tmp.getContext('2d')!;

  const config = {
    [AsteroidDamageLevel.FRACTURED]: {
      opacity: 0.8,
      tint: 'rgba(100, 100, 100, 0.15)',
      cracks: true,
      cracksColor: 'rgba(80, 80, 80, 0.7)',
      lineWidth: 1,
    },
    [AsteroidDamageLevel.CRUMBLING]: {
      opacity: 0.6,
      tint: 'rgba(150, 75, 0, 0.3)',
      cracks: true,
      cracksColor: 'rgba(60, 30, 0, 0.85)',
      lineWidth: 2,
    },
  }[level]!;

  ctx.globalAlpha = config.opacity;
  ctx.drawImage(source, 0, 0);
  ctx.globalAlpha = 1;

  tmpCtx.clearRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
  tmpCtx.fillStyle = config.tint;
  tmpCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
  tmpCtx.globalCompositeOperation = 'destination-in';
  tmpCtx.drawImage(source, 0, 0);
  tmpCtx.globalCompositeOperation = 'source-over';
  ctx.drawImage(tmp, 0, 0);

  if (config.cracks) {
    tmpCtx.clearRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
    tmpCtx.strokeStyle = config.cracksColor;
    tmpCtx.lineWidth = config.lineWidth;
    tmpCtx.beginPath();
    tmpCtx.moveTo(4, 4);
    tmpCtx.lineTo(28, 28);
    tmpCtx.moveTo(10, 22);
    tmpCtx.lineTo(22, 10);
    tmpCtx.moveTo(0, 16);
    tmpCtx.lineTo(32, 16);
    tmpCtx.stroke();

    tmpCtx.globalCompositeOperation = 'destination-in';
    tmpCtx.drawImage(source, 0, 0);
    tmpCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(tmp, 0, 0);
  }

  return damaged;
}

function generateAsteroidDamageVariants(base: AsteroidSprite): DamagedAsteroidSprite {
  return {
    [AsteroidDamageLevel.NONE]: base,
    [AsteroidDamageLevel.FRACTURED]: {
      base: applyAsteroidDamageToCanvas(base.base, AsteroidDamageLevel.FRACTURED),
    },
    [AsteroidDamageLevel.CRUMBLING]: {
      base: applyAsteroidDamageToCanvas(base.base, AsteroidDamageLevel.CRUMBLING),
    },
  };
}

// --- Sprite Generation ---

function drawProceduralAsteroidBlock(typeId: string): void {
  const baseCanvas = createBlankCanvas();
  const ctx = baseCanvas.getContext('2d')!;

  switch (typeId) {
    case 'circleRock0': drawRoundedRock(ctx); break;
    case 'rock0': drawRockBlock(ctx); break;
    case 'facetRock0': drawFacetRockBlock(ctx); break;
    case 'facetRock1': drawFacetRockAltBlock(ctx); break;
    case 'facetRockSlim0': drawFacetRockSlimBlock(ctx); break;
    default: throw new Error(`Unknown asteroid block type: ${typeId}`);
  }

  const sprite: AsteroidSprite = { base: baseCanvas };
  const damagedVariants = generateAsteroidDamageVariants(sprite);
  asteroidSpriteCache.set(typeId, damagedVariants);
}

// --- API ---

export function initializeAsteroidBlockSpriteCache(): void {
  for (const block of getAllAsteroidBlockTypes()) {
    drawProceduralAsteroidBlock(block.id);
  }
}

export function initializeGL2AsteroidBlockSpriteCache(gl: WebGL2RenderingContext): void {
  let count = 0;

  for (const block of getAllAsteroidBlockTypes()) {
    const raster = asteroidSpriteCache.get(block.id);
    if (!raster) {
      console.warn(`[GL2Cache] No raster asteroid sprite for: ${block.id}`);
      continue;
    }

    try {
      const glVariants: GLDamagedAsteroidSprite = {
        [AsteroidDamageLevel.NONE]: {
          base: createGL2TextureFromCanvas(gl, raster[AsteroidDamageLevel.NONE].base),
        },
        [AsteroidDamageLevel.FRACTURED]: {
          base: createGL2TextureFromCanvas(gl, raster[AsteroidDamageLevel.FRACTURED].base),
        },
        [AsteroidDamageLevel.CRUMBLING]: {
          base: createGL2TextureFromCanvas(gl, raster[AsteroidDamageLevel.CRUMBLING].base),
        },
      };

      gl2AsteroidSpriteCache.set(block.id, glVariants);
      count++;
    } catch (e) {
      console.error(`[GL2Cache] Failed to create GL2 asteroid sprite: ${block.id}`, e);
    }
  }

  console.log(`[GL2Cache] Total GL2 asteroid textures initialized: ${count}`);
}

export function destroyGL2AsteroidBlockSpriteCache(gl: WebGL2RenderingContext): void {
  for (const damaged of gl2AsteroidSpriteCache.values()) {
    for (const level of Object.values(AsteroidDamageLevel)) {
      const sprite = damaged[level];
      if (sprite.base && gl.isTexture(sprite.base)) {
        gl.deleteTexture(sprite.base);
      }
    }
  }

  gl2AsteroidSpriteCache.clear();
}

export function getAsteroidBlockSprite(
  typeId: string,
  level: AsteroidDamageLevel = AsteroidDamageLevel.NONE
): AsteroidSprite {
  const entry = asteroidSpriteCache.get(typeId);
  if (!entry) throw new Error(`Asteroid sprite not cached: ${typeId}`);
  return entry[level];
}

export function getGL2AsteroidBlockSprite(
  typeId: string,
  level: AsteroidDamageLevel = AsteroidDamageLevel.NONE
): GLAsteroidSprite {
  const entry = gl2AsteroidSpriteCache.get(typeId);
  if (!entry) throw new Error(`GL2 asteroid sprite not cached: ${typeId}`);
  return entry[level];
}
