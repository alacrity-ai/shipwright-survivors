// src/ui/primitives/UIUtilityButton.ts

import { brightenColor } from '@/shared/colorUtils';

export interface UIUtilityButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  isHovered: boolean;
  isActive: boolean;
  onClick: () => void;
  style?: {
    borderRadius?: number;
    backgroundColor?: string;
    borderColor?: string;
    alpha?: number;
    activeColor?: string; // 🆕 Used when isActive === true
    backgroundGradient?: {
      type: 'linear' | 'radial';
      stops: { offset: number; color: string }[];
      from?: [number, number];
      to?: [number, number];
      radius?: number;
    };
  };
}

export function drawUtilityButton(ctx: CanvasRenderingContext2D, button: UIUtilityButton): void {
  const { x, y, width, height, label, isHovered, isActive, style = {} } = button;

  const borderRadius = style.borderRadius ?? 0;
  const alpha = style.alpha ?? 1.0;

  ctx.save();
  ctx.globalAlpha = alpha;

  // === Determine fill style ===
  let fillStyle: string | CanvasGradient;

  if (isActive && style.activeColor) {
    fillStyle = style.activeColor;
  } else if (!isActive && style.backgroundGradient) {
    const { type, stops, from = [x, y], to = [x + width, y + height], radius = width / 2 } = style.backgroundGradient;

    const gradient = type === 'linear'
      ? ctx.createLinearGradient(from[0], from[1], to[0], to[1])
      : ctx.createRadialGradient(from[0], from[1], 0, from[0], from[1], radius);

    for (const stop of stops) {
      const color = isHovered ? brightenColor(stop.color, 0.1) : stop.color;
      gradient.addColorStop(stop.offset, color);
    }

    fillStyle = gradient;
  } else {
    fillStyle = style.backgroundColor ??
      (isActive ? '#4f4' : isHovered ? '#444' : '#222');
  }

  const strokeStyle = style.borderColor ?? (isActive ? '#0f0' : '#888');

  // === Draw background ===
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1;

  if (borderRadius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, borderRadius);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
  }

  // === Draw label ===
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + height / 2);

  ctx.restore();
}
