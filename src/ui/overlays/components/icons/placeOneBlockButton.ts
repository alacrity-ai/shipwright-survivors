// src/ui/overlays/components/icons/placeOneBlockButton.ts
//
// CRT-style minimalist icon for “Place ONE Block”.
// Matches the 64×64 canvas, neon-cyan palette and rounded-rectangle
// frame used by the sibling Place-All / Roll icons.

let cachedPlaceOneBlockIconCanvas: HTMLCanvasElement | undefined;

/** Returns a memoised <canvas> containing a framed single-block glyph. */
export function getPlaceOneBlockIcon(): HTMLCanvasElement {
  if (cachedPlaceOneBlockIconCanvas) return cachedPlaceOneBlockIconCanvas;

  /* ────────────────────────── canvas bootstrap ─────────────────────────── */
  const canvas = document.createElement('canvas');
  canvas.width  = 64;
  canvas.height = 64;

  const ctx = canvas.getContext('2d')!;
  ctx.save();

  /* ────────────────────────────── palette ──────────────────────────────── */
  const BORDER  = '#00FFFF';
  const FILL    = '#001122';
  const BLOCK   = '#00FFFF';

  /* ───────────────────────── frame background ──────────────────────────── */
  ctx.fillStyle   = FILL;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth   = 2;
  ctx.roundRect(0, 0, 64, 64, 8);
  ctx.fill();
  ctx.stroke();

  /* ─────────────────────────── single block ────────────────────────────── */
  const blockSize  = 24;
  const blockX     = (64 - blockSize) / 2;
  const blockY     = (64 - blockSize) / 2;

  ctx.beginPath();
  ctx.fillStyle   = BLOCK;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth   = 1.5;
  ctx.roundRect(blockX, blockY, blockSize, blockSize, 4);
  ctx.fill();
  ctx.stroke();

  /* ───────────────────────────── cleanup ───────────────────────────────── */
  ctx.restore();
  cachedPlaceOneBlockIconCanvas = canvas;
  return canvas;
}
