// src/ui/overlays/components/icons/jumpCastButton.ts

let cachedJumpCastIconCanvas: HTMLCanvasElement | undefined;

/**
 * Returns a cached minimalist CRT‑style “Jump Cast” (fast‑travel) icon.
 *
 * Visual grammar:
 *   • Rounded 64 × 64 frame identical to other HUD icons.
 *   • Central hexagonal “gate” rendered as a thin violet outline.
 *   • A 45° motion‑trail / chevron streak passes through the gate,
 *     implying instantaneous translation.
 *
 * Design rationale:
 *   — Hexagon ↔ sci‑fi gate silhouette (distinct from the square block motif).
 *   — 45° streak conveys diagonal motion, avoiding directional bias (up, down).
 *   — Single‑hue violet palette differentiates non‑block actions.
 */
export function getJumpCastIcon(): HTMLCanvasElement {
  if (cachedJumpCastIconCanvas) return cachedJumpCastIconCanvas;

  // ── Canvas bootstrap ───────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.save();

  // ── Palette ────────────────────────────────────────────────────────────
  const BORDER = '#AA66FF';     // bright violet border / stroke
  const FILL   = '#001122';     // CRT charcoal background
  const GATE   = '#AA66FF';     // gate outline
  const STREAK = '#AA66FF';     // motion streak

  // ── Background frame ───────────────────────────────────────────────────
  ctx.fillStyle = FILL;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.roundRect(0, 0, 64, 64, 8);
  ctx.fill();
  ctx.stroke();

  // ── Hex‑gate glyph ─────────────────────────────────────────────────────
  const gateRadius = 14;               // distance from centre to a vertex
  const centerX = 32;
  const centerY = 36;                  // biased downward to leave room for streak
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 6 + (i * Math.PI) / 3; // 30° offset for flat top
    const x = centerX + gateRadius * Math.cos(angle);
    const y = centerY + gateRadius * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = GATE;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── Motion streak (45° chevron) ────────────────────────────────────────
  ctx.beginPath();
  ctx.fillStyle = STREAK;
  ctx.moveTo(16, 20);   // tail
  ctx.lineTo(22, 14);   // upper edge
  ctx.lineTo(48, 40);   // tip
  ctx.lineTo(42, 46);   // lower edge
  ctx.closePath();
  ctx.fill();

  // ── Cleanup / cache ────────────────────────────────────────────────────
  ctx.restore();
  cachedJumpCastIconCanvas = canvas;
  return canvas;
}
