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
  disabled?: boolean; // NEW

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
    x, y, width, height, label, isHovered, style = {}, disabled = false
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

  const scaledWidth = width * uiScale;
  const scaledHeight = height * uiScale;
  const scaledFont = textFont.replace(
    /(\d+)(px)/,
    (_, size, unit) => `${Math.round(parseInt(size) * uiScale)}${unit}`
  );

  const effectiveAlpha = disabled ? 0.4 : alpha;
  const effectiveBorderColor = disabled ? '#444' : borderColor;
  const effectiveTextColor = disabled ? '#888' : textColor;

  ctx.save();
  ctx.globalAlpha = effectiveAlpha;

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

    const effectiveStops = stops.map(stop => ({
      offset: stop.offset,
      color: disabled ? '#111' : (isHovered ? brightenColor(stop.color, 0.1) : stop.color)
    }));

    for (const stop of effectiveStops) {
      gradient.addColorStop(stop.offset, stop.color);
    }

    fillStyle = gradient;
  } else {
    fillStyle = disabled
      ? '#111'
      : (isHovered ? '#333' : backgroundColor ?? '#222');
  }

  // === Draw Background ===
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = effectiveBorderColor;
  ctx.lineWidth = 1 * uiScale;

  ctx.beginPath();
  ctx.roundRect(x, y, scaledWidth, scaledHeight, borderRadius);
  ctx.fill();
  ctx.stroke();

  // === Draw Label ===
  ctx.fillStyle = effectiveTextColor;
  ctx.font = scaledFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + scaledWidth / 2, y + scaledHeight / 2);

  ctx.restore();
}

/**
 * Handles interaction for a UIButton, computing hover and click state.
 *
 * @param button - UIButton to evaluate
 * @param mouseX - Current mouse X position
 * @param mouseY - Current mouse Y position
 * @param wasClicked - Whether the mouse was just clicked this frame
 * @param uiScale - Optional UI scale factor (default = 1.0)
 * @returns true if the button was clicked
 */
export function handleButtonInteraction(
  button: UIButton,
  mouseX: number,
  mouseY: number,
  wasClicked: boolean,
  uiScale: number = 1.0
): boolean {
  if (button.disabled) {
    button.isHovered = false;
    return false;
  }

  const scaledWidth = button.width * uiScale;
  const scaledHeight = button.height * uiScale;

  const isHovered =
    mouseX >= button.x && mouseX <= button.x + scaledWidth &&
    mouseY >= button.y && mouseY <= button.y + scaledHeight;

  button.isHovered = isHovered;

  if (isHovered && wasClicked) {
    button.onClick();
    return true;
  }

  return false;
}
