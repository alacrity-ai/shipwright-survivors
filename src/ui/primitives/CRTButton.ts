// src/ui/primitives/UICRTButton.ts

import { brightenColor } from '@/shared/colorUtils';

export interface UICRTButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
  isHovered?: boolean;

  /** Internal: whether this button was hovered in the previous frame */
  _wasHoveredLastFrame?: boolean;

  style?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    font?: string;
    glow?: boolean;
    chromaticAberration?: boolean;
    alpha?: number;
  };
}

/**
 * Draws a stylized CRT-style button with optional glow and chromatic aberration.
 *
 * @param ctx - Canvas 2D rendering context
 * @param button - Button configuration
 * @param uiScale - UI scale factor for font and blur (default = 1.0)
 */
export function drawCRTButton(
  ctx: CanvasRenderingContext2D,
  button: UICRTButton,
  uiScale: number = 1.0
): void {
  const {
    x, y, width, height, label, isHovered, style = {}
  } = button;

  const {
    backgroundColor = '#001100',
    borderColor = '#00ff41',
    textColor = '#00ff41',
    font = '13px "Courier New", monospace',
    glow = true,
    chromaticAberration = true,
    alpha = 1.0,
  } = style;

  button._wasHoveredLastFrame = isHovered;

  // === Scale width and height only ===
  const scaledWidth = width * uiScale;
  const scaledHeight = height * uiScale;

  const scaledFont = font.replace(
    /(\d+)(px)/,
    (_, sz, unit) => `${Math.round(parseInt(sz) * uiScale)}${unit}`
  );

  const highlightAmount = 0.8;
  const effectiveBorderColor = isHovered ? brightenColor(borderColor, highlightAmount) : borderColor;
  const effectiveTextColor = isHovered ? brightenColor(textColor, highlightAmount) : textColor;

  // === Background Fill ===
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(x, y, scaledWidth, scaledHeight);

  if (glow) {
    ctx.shadowColor = effectiveBorderColor;
    ctx.shadowBlur = 8 * uiScale;
  }

  ctx.strokeStyle = effectiveBorderColor;
  ctx.lineWidth = 2 * uiScale;
  ctx.strokeRect(x, y, scaledWidth, scaledHeight);
  ctx.restore();

  // === Text Rendering ===
  const cx = x + scaledWidth / 2;
  const cy = y + scaledHeight / 2;

  ctx.save();
  ctx.font = scaledFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (glow) {
    ctx.shadowColor = effectiveTextColor;
    ctx.shadowBlur = 4 * uiScale;
  }

  if (chromaticAberration) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff0000';
    ctx.fillText(label, cx - 0.5 * uiScale, cy);
    ctx.fillStyle = '#0000ff';
    ctx.fillText(label, cx + 0.5 * uiScale, cy);
    ctx.restore();
  }

  ctx.globalAlpha = 1.0;
  ctx.fillStyle = effectiveTextColor;
  ctx.fillText(label, cx, cy);
  ctx.restore();
}
