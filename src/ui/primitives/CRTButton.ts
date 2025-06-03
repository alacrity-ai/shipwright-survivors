// src/ui/primitives/UICRTButton.ts

import { brightenColor } from "@/shared/colorUtils";

export interface UICRTButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
  isHovered?: boolean;

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

export function drawCRTButton(
  ctx: CanvasRenderingContext2D,
  button: UICRTButton
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

  const highlightAmount = 0.8;

  // === Apply hover brightening ===
  const effectiveBorderColor = isHovered ? brightenColor(borderColor, highlightAmount) : borderColor;
  const effectiveTextColor = isHovered ? brightenColor(textColor, highlightAmount) : textColor;

  ctx.save();
  ctx.globalAlpha = alpha;

  // === Background Fill ===
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(x, y, width, height);

  // === Border Glow ===
  if (glow) {
    ctx.shadowColor = effectiveBorderColor;
    ctx.shadowBlur = 8;
  }

  ctx.strokeStyle = effectiveBorderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  ctx.restore();

  // === Label ===
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = x + width / 2;
  const cy = y + height / 2;

  if (glow) {
    ctx.shadowColor = effectiveTextColor;
    ctx.shadowBlur = 4;
  }

  if (chromaticAberration) {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ff0000';
    ctx.fillText(label, cx - 0.5, cy);
    ctx.fillStyle = '#0000ff';
    ctx.fillText(label, cx + 0.5, cy);
    ctx.restore();
  }

  ctx.globalAlpha = 1.0;
  ctx.fillStyle = effectiveTextColor;
  ctx.fillText(label, cx, cy);
  ctx.restore();
}