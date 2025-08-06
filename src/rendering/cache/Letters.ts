const letterCache = new Map<string, HTMLCanvasElement>();

const CANVAS_SIZE = 256;
const DEFAULT_STROKE_COLOR = '#00FFFF';
const FONT_FAMILY = `'Courier New', 'Consolas', monospace`;
const FONT_SIZE = 180;
const LINE_WIDTH = 5;

/**
 * Constructs a unique cache key using the letter and stroke color.
 */
function getCacheKey(letter: string, strokeColor: string): string {
  return `${letter.toUpperCase()}|${strokeColor}`;
}

/**
 * Returns a cached minimalist CRT-style letter icon with customizable stroke color.
 * @param letter - The letter to render.
 * @param strokeColor - Optional stroke color for the letter outline.
 */
export function getMinimalistLetterIcon(
  letter: string,
  strokeColor: string = DEFAULT_STROKE_COLOR
): HTMLCanvasElement {
  const upper = letter.toUpperCase();
  const cacheKey = getCacheKey(upper, strokeColor);

  if (letterCache.has(cacheKey)) return letterCache.get(cacheKey)!;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  const ctx = canvas.getContext('2d')!;
  ctx.save();

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.font = `bold ${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.strokeText(upper, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

  ctx.restore();

  letterCache.set(cacheKey, canvas);
  return canvas;
}

/**
 * Clears all cached letter icons.
 */
export function clearLetterCache(): void {
  letterCache.clear();
}
