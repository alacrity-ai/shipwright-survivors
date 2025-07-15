// src/ui/overlays/components/icons/activeContractsButton.ts

let cachedActiveContractsIconCanvas: HTMLCanvasElement | undefined;

/**
 * Returns a cached minimalist CRT‑style “active contracts” icon.
 *
 * Visual grammar
 * ──────────────
 *  • Rounded 64 × 64 frame (consistent with other HUD buttons).
 *  • Stylised contract pad: rectangular sheet with 3 horizontal “task lines”.
 *  • Prominent right‑hand check‑mark to imply active / in‑progress tracking.
 *  • Monotone gold palette differentiates contract‑tracking from cyan block
 *    operations and violet Jump Cast.
 */
export function getActiveContractsIcon(): HTMLCanvasElement {
  if (cachedActiveContractsIconCanvas) return cachedActiveContractsIconCanvas;

  // ── Canvas bootstrap ───────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.save();

  // ── Palette ────────────────────────────────────────────────────────
  const BORDER = '#FFD700';      // gold frame / strokes
  const FILL   = '#001122';      // CRT charcoal background
  const SHEET  = '#FFD700';      // contract sheet & lines
  const CHECK  = '#FFD700';      // check‑mark

  // ── Background frame ──────────────────────────────────────────────
  ctx.fillStyle = FILL;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.roundRect(0, 0, 64, 64, 8);
  ctx.fill();
  ctx.stroke();

  // ── Contract sheet ────────────────────────────────────────────────
  const sheetWidth  = 28;
  const sheetHeight = 36;
  const sheetX = 18;
  const sheetY = 14;

  ctx.beginPath();
  ctx.strokeStyle = SHEET;
  ctx.lineWidth = 1.5;
  ctx.roundRect(sheetX, sheetY, sheetWidth, sheetHeight, 3);
  ctx.stroke();

  // ── Task lines (three horizontal bars) ────────────────────────────
  ctx.lineWidth = 2;
  const lineStart = sheetX + 4;
  const lineEnd   = sheetX + sheetWidth - 4;
  const firstLineY = sheetY + 8;
  const lineSpacing = 8;

  for (let i = 0; i < 3; i++) {
    const y = firstLineY + i * lineSpacing;
    ctx.beginPath();
    ctx.moveTo(lineStart, y);
    ctx.lineTo(lineEnd,   y);
    ctx.stroke();
  }

  // ── Check‑mark glyph ──────────────────────────────────────────────
  ctx.beginPath();
  ctx.strokeStyle = CHECK;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.moveTo(40, 40);   // tail
  ctx.lineTo(46, 46);   // vertex
  ctx.lineTo(54, 32);   // tip
  ctx.stroke();

  // ── Cleanup / cache ───────────────────────────────────────────────
  ctx.restore();
  cachedActiveContractsIconCanvas = canvas;
  return canvas;
}
