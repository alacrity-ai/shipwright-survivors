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

  // Optional styling
  style?: {
    borderRadius?: number;
    backgroundColor?: string;
    borderColor?: string;
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

export function drawButton(ctx: CanvasRenderingContext2D, button: UIButton) {
  const {
    x, y, width, height, label, isHovered, style = {}
  } = button;

  const borderRadius = style.borderRadius ?? 6;
  const alpha = style.alpha ?? 1.0;
  const borderColor = style.borderColor ?? '#666';

  ctx.save();
  ctx.globalAlpha = alpha;

  // === Determine fill style (solid or gradient) ===
  let fillStyle: string | CanvasGradient;

  if (style.backgroundGradient) {
    const { type, stops, from = [x, y], to = [x + width, y + height], radius = width / 2 } = style.backgroundGradient;

    const gradient = type === 'linear'
      ? ctx.createLinearGradient(from[0], from[1], to[0], to[1])
      : ctx.createRadialGradient(from[0], from[1], 0, from[0], from[1], radius);

    for (const stop of stops) {
      // Slightly brighten colors on hover
      const color = isHovered ? brightenColor(stop.color, 0.1) : stop.color;
      gradient.addColorStop(stop.offset, color);
    }

    fillStyle = gradient;
  } else {
    fillStyle = style.backgroundColor ?? (isHovered ? '#333' : '#222');
  }

  // === Draw button background ===
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.fill();
  ctx.stroke();

  // === Draw label ===
  ctx.fillStyle = '#fff';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + height / 2);

  ctx.restore();
}

