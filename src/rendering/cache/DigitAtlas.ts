// src/rendering/cache/DigitAtlas.ts

import { createGL2TextureFromCanvas } from '@/rendering/gl/glTextureUtils';

export interface DigitAtlas {
  texture: WebGLTexture;
  width: number;
  height: number;
  tileWidth: number;  // UV width (1 / 11 for 0–9 plus '+')
  tileHeight: number; // Full height (for 1 row)
}

const DIGIT_SIZE = 32;    // pixel size per glyph
const DIGIT_COUNT = 10;   // digits only
const EXTRA_SYMBOLS = ['+']; // extendable
const TOTAL_GLYPHS = DIGIT_COUNT + EXTRA_SYMBOLS.length;

let glAtlas: DigitAtlas | null = null;

/**
 * Creates a procedural monospace font atlas (digits 0–9 and '+') for WebGL2.
 * Glyphs are white for flexible tinting in the shader.
 */
export function initializeDigitAtlas(gl: WebGL2RenderingContext): DigitAtlas {
  if (glAtlas) return glAtlas;

  const atlasWidth = DIGIT_SIZE * TOTAL_GLYPHS;
  const atlasHeight = DIGIT_SIZE;

  const canvas = document.createElement('canvas');
  canvas.width = atlasWidth;
  canvas.height = atlasHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;

  ctx.clearRect(0, 0, atlasWidth, atlasHeight);
  ctx.font = `${DIGIT_SIZE * 0.8}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';

  // Draw digits 0–9
  for (let i = 0; i < DIGIT_COUNT; i++) {
    const cx = i * DIGIT_SIZE + DIGIT_SIZE / 2;
    const cy = DIGIT_SIZE / 2;
    ctx.fillText(String(i), cx, cy);
  }

  // Draw symbols (currently only '+')
  for (let j = 0; j < EXTRA_SYMBOLS.length; j++) {
    const index = DIGIT_COUNT + j;
    const cx = index * DIGIT_SIZE + DIGIT_SIZE / 2;
    const cy = DIGIT_SIZE / 2;
    ctx.fillText(EXTRA_SYMBOLS[j], cx, cy);
  }

  const texture = createGL2TextureFromCanvas(gl, canvas);

  glAtlas = {
    texture,
    width: atlasWidth,
    height: atlasHeight,
    tileWidth: DIGIT_SIZE / atlasWidth,   // = 1 / TOTAL_GLYPHS
    tileHeight: DIGIT_SIZE / atlasHeight // = 1
  };

  return glAtlas;
}

export function getDigitAtlas(): DigitAtlas {
  if (!glAtlas) throw new Error('Digit atlas not initialized');
  return glAtlas;
}

export function destroyDigitAtlas(gl: WebGL2RenderingContext): void {
  if (glAtlas && gl.isTexture(glAtlas.texture)) {
    gl.deleteTexture(glAtlas.texture);
  }
  glAtlas = null;
}
