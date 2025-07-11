// src/ui/primitives/UIProgressBarMinimalist.ts
//  ⭑  Super-light CRT-style progress bar  ⭑

export interface MinimalistProgressBarOptions {
  borderRadius?: number;
  borderColor?: string;
  fillColor?: string;         // colour of the empty track
  progressColor?: string;     // colour of the filled portion
  alpha?: number;
  borderWidth?: number;
}

/**
 * Draws a frameless, text-free progress bar that fills from left→right.
 *
 * @param ctx      2D canvas context
 * @param x,y      top-left corner
 * @param width    total bar width
 * @param height   total bar height
 * @param progress number in [0, 1] indicating completion ratio
 * @param options  overrides for stylistic tuning
 */
export function drawMinimalistProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  progress: number,
  options: MinimalistProgressBarOptions = {},
): void {
  const {
    borderRadius  = 6,
    borderColor   = '#00FFFF',
    fillColor     = '#001122',
    progressColor = '#00FFFF',
    alpha         = 1.0,
    borderWidth   = 2,
  } = options;

  // Constrain progress defensively
  const p = Math.max(0, Math.min(1, progress));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = borderColor;

  // ─── Track (empty background) ───
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.fill();
  ctx.stroke();               // keeps the cyan outline identical to windows

  // ─── Filled portion ───
  ctx.fillStyle = progressColor;
  const inner = {
    x: x + borderWidth,
    y: y + borderWidth,
    w: (width  - 2 * borderWidth) * p,
    h:  height - 2 * borderWidth,
  };
  if (inner.w > 0) {
    ctx.beginPath();
    ctx.roundRect(inner.x, inner.y, inner.w, inner.h, Math.max(0, borderRadius - borderWidth));
    ctx.fill();
  }

  ctx.restore();
}
