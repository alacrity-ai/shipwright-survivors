// src/ui/primitives/UIMinimalistWindow.ts

export interface MinimalistWindowOptions {
  borderRadius?: number;
  borderColor?: string;
  fillColor?: string;
  alpha?: number;
}

/**
 * Draws a minimalist CRT-style window.
 * Matches the style of UIMinimalistButton.
 */
export function drawMinimalistWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  options: MinimalistWindowOptions = {}
): void {
  const {
    borderRadius = 8,
    borderColor = '#00FFFF',
    fillColor = '#001122',
    alpha = 1.0,
  } = options;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = fillColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
