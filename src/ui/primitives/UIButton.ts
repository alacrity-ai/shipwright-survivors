// src/ui/primitives/UIButton.ts

import { brightenColor } from '@/shared/colorUtils';

export interface UIButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
  isHovered?: boolean;

  style?: {
    borderRadius?: number;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    textFont?: string;
    alpha?: number;
    backgroundGradient?: {
      type: 'linear' | 'radial';
      stops: { offset: number; color: string }[];
      from?: [number, number];
      to?: [number, number];
      radius?: number;
    };
  };
}

/**
 * Renders a UIButton using pre-scaled coordinates and dimensions.
 *
 * @param ctx - Canvas rendering context
 * @param button - UIButton definition
 * @param uiScale - UI scale factor for fonts and line width
 */
export function drawButton(
  ctx: CanvasRenderingContext2D,
  button: UIButton,
  uiScale: number = 1.0
): void {
  const {
    x, y, width, height, label, isHovered, style = {}
  } = button;

  const {
    borderRadius = 6,
    backgroundColor,
    borderColor = '#666',
    textColor = '#fff',
    textFont = '13px monospace',
    alpha = 1.0,
    backgroundGradient
  } = style;

  // === Apply scaling only to dimensions, not position or radius ===
  const scaledWidth = width * uiScale;
  const scaledHeight = height * uiScale;
  const scaledFont = textFont.replace(
    /(\d+)(px)/,
    (_, size, unit) => `${Math.round(parseInt(size) * uiScale)}${unit}`
  );

  ctx.save();
  ctx.globalAlpha = alpha;

  // === Fill Style ===
  let fillStyle: string | CanvasGradient;

  if (backgroundGradient) {
    const {
      type,
      stops,
      from = [x, y],
      to = [x + scaledWidth, y + scaledHeight],
      radius: gradRadius = scaledWidth / 2,
    } = backgroundGradient;

    const gradient = type === 'linear'
      ? ctx.createLinearGradient(from[0], from[1], to[0], to[1])
      : ctx.createRadialGradient(from[0], from[1], 0, from[0], from[1], gradRadius);

    for (const stop of stops) {
      gradient.addColorStop(stop.offset, isHovered ? brightenColor(stop.color, 0.1) : stop.color);
    }

    fillStyle = gradient;
  } else {
    fillStyle = backgroundColor ?? (isHovered ? '#333' : '#222');
  }

  // === Draw Background ===
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1 * uiScale;

  ctx.beginPath();
  ctx.roundRect(x, y, scaledWidth, scaledHeight, borderRadius); // radius unscaled
  ctx.fill();
  ctx.stroke();

  // === Draw Label ===
  ctx.fillStyle = textColor;
  ctx.font = scaledFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + scaledWidth / 2, y + scaledHeight / 2);

  ctx.restore();
}
