const letterCache = new Map<string, HTMLCanvasElement>();

const CANVAS_SIZE = 256;
const STROKE_COLOR = '#00FFFF';
const FONT_FAMILY = `'Courier New', 'Consolas', monospace`;
const FONT_SIZE = 180; // Suitable for 256x256 canvas
const LINE_WIDTH = 5;

/**
 * Returns a cached minimalist CRT-style letter icon with monospace stenciled-style font.
 */
export function getMinimalistLetterIcon(letter: string): HTMLCanvasElement {
  const upper = letter.toUpperCase();
  if (letterCache.has(upper)) return letterCache.get(upper)!;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.save();

  ctx.strokeStyle = STROKE_COLOR;
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.font = `bold ${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.strokeText(upper, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

  ctx.restore();
  letterCache.set(upper, canvas);
  return canvas;
}

/**
 * Clears the letter cache. Used for memory management.
 */
export function clearLetterCache(): void {
  letterCache.clear();
}
