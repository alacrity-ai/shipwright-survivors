// src/ui/primitives/UIButton.ts

import { DEFAULT_CONFIG } from '@/config/ui';

import { audioManager } from '@/audio/Audio';
import { brightenColor } from '@/shared/colorUtils';
import { GlobalEventBus } from '@/core/EventBus';

export interface UIButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
  onHover?: () => void;
  isHovered?: boolean;
  wasHovered?: boolean;
  disabled?: boolean;

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
 */
export function drawButton(
  ctx: CanvasRenderingContext2D,
  button: UIButton,
  uiScale: number = 1.0,
  fontSize: number = 13,
): void {
  const {
    x, y, width, height, label, isHovered, style = {}, disabled = false
  } = button;

  const { 
    textColor: defaultTextColor, 
    accentColor, 
    disabledColor,
    infoTextColor,
    backgroundColor: defaultBackgroundColor,
   } = DEFAULT_CONFIG.general;

  const {
    borderRadius = 6,
    backgroundColor = defaultBackgroundColor,
    borderColor = accentColor,
    textColor = defaultTextColor,
    textFont = `${fontSize}px monospace`,
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
  const effectiveBorderColor = disabled ? disabledColor : borderColor;
  const effectiveTextColor = disabled ? infoTextColor : textColor;

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
      color: disabled ? infoTextColor : (isHovered ? brightenColor(stop.color, 0.3) : stop.color)
    }));

    for (const stop of effectiveStops) {
      gradient.addColorStop(stop.offset, stop.color);
    }

    fillStyle = gradient;
  } else {
    fillStyle = disabled
      ? '#111'
      : (isHovered ? infoTextColor : backgroundColor ?? disabledColor);
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
    button.wasHovered = false;
    return false;
  }

  const scaledWidth = button.width * uiScale;
  const scaledHeight = button.height * uiScale;

  const isHoveredNow =
    mouseX >= button.x && mouseX <= button.x + scaledWidth &&
    mouseY >= button.y && mouseY <= button.y + scaledHeight;

  const justHovered = isHoveredNow && !button.wasHovered;
  const noLongerHovered = !isHoveredNow && button.wasHovered;

  button.isHovered = isHoveredNow;
  button.wasHovered = isHoveredNow;

  if (justHovered) {
    if (button.onHover) {
      button.onHover();
    } else {
      audioManager.play('assets/sounds/sfx/ui/hover_00.wav', 'sfx', { maxSimultaneous: 4 });
    }

    GlobalEventBus.emit('cursor:change', { type: 'hovered' });
  }

  if (noLongerHovered) {
    GlobalEventBus.emit('cursor:restore', undefined);
  }

  if (isHoveredNow && wasClicked) {
    button.onClick();
    return true;
  }

  return false;
}
