// src/ui/primitives/UIUtilityButton.ts

import { brightenColor } from '@/shared/colorUtils';
import { getUniformScaleFactor } from '@/config/view';

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
    activeColor?: string;
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
 * Draws a rectangular UI utility button with optional state and style decorations.
 *
 * @param ctx - Canvas 2D rendering context
 * @param button - Button configuration
 * @param uiScale - Optional UI scale factor (default = 1.0)
 */
export function drawUtilityButton(
  ctx: CanvasRenderingContext2D,
  button: UIUtilityButton,
  uiScale: number = 1.0
): void {
  const { x, y, width, height, label, isHovered, isActive, style = {} } = button;

  const {
    borderRadius = 0,
    backgroundColor,
    borderColor,
    alpha = 1.0,
    activeColor,
    backgroundGradient,
  } = style;

  // === Only scale dimensions and visuals ===
  const scaledWidth = width * uiScale;
  const scaledHeight = height * uiScale;
  const drawR = borderRadius; // ← Not scaled

  ctx.save();
  ctx.globalAlpha = alpha;

  // === Determine fill style ===
  let fillStyle: string | CanvasGradient;

  if (isActive && activeColor) {
    fillStyle = activeColor;
  } else if (!isActive && backgroundGradient) {
    const {
      type,
      stops,
      from = [x, y],
      to = [x + width, y + height],
      radius = width / 2,
    } = backgroundGradient;

    // Do not scale positions; only scale dimensions and radius
    const gradient = type === 'linear'
      ? ctx.createLinearGradient(from[0], from[1], to[0], to[1])
      : ctx.createRadialGradient(
          from[0], from[1], 0,
          from[0], from[1], radius * uiScale // ← Only radius is scaled for appearance
        );

    for (const stop of stops) {
      gradient.addColorStop(stop.offset, isHovered ? brightenColor(stop.color, 0.1) : stop.color);
    }

    fillStyle = gradient;
  } else {
    fillStyle = backgroundColor ?? (isActive ? '#4f4' : isHovered ? '#444' : '#222');
  }

  const strokeStyleFinal = borderColor ?? (isActive ? '#0f0' : '#888');

  // === Draw shape ===
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyleFinal;
  ctx.lineWidth = 1 * uiScale;

  if (drawR > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, scaledWidth, scaledHeight, drawR); // radius unscaled
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(x, y, scaledWidth, scaledHeight);
    ctx.strokeRect(x, y, scaledWidth, scaledHeight);
  }

  // === Label ===
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.round(12 * uiScale * getUniformScaleFactor())}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + scaledWidth / 2, y + scaledHeight / 2);

  ctx.restore();
}
