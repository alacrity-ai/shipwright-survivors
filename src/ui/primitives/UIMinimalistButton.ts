// src/ui/primitives/UIMinimalistButton.ts

import { getUniformScaleFactor } from '@/config/view';
import { brightenColor } from '@/shared/colorUtils';

export interface UIMinimalistButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  isHovered: boolean;
  onClick: () => void;
  iconCanvas?: HTMLCanvasElement;
  style?: {
    borderRadius?: number;
    fillColor?: string;
    borderColor?: string;
    textColor?: string;
    highlightColor?: string;
    alpha?: number;
    fontSize?: number;
  };
}

export function drawMinimalistButton(
  ctx: CanvasRenderingContext2D,
  button: UIMinimalistButton,
  uiScale: number = 1.0,
): void {
  const {
    x,
    y,
    width,
    height,
    label,
    isHovered,
    iconCanvas,
    style = {},
  } = button;

  const {
    borderRadius = 6,
    fillColor = '#001122',
    borderColor = '#00FFFF',
    textColor = '#00FFFF',
    alpha = 1.0,
    fontSize = 16,
  } = style;

  const scale = getUniformScaleFactor();
  const scaledWidth = width * uiScale;
  const scaledHeight = height * uiScale;
  const drawFontSize = fontSize * uiScale * scale;
  const r = borderRadius;

  // === Derive hover state colors ===
  let effectiveFillColor = fillColor;
  let effectiveBorderColor = borderColor;

  if (isHovered) {
    effectiveBorderColor = brightenColor(borderColor, 0.8);
    effectiveFillColor = brightenColor(fillColor, 0.3);
  }

  // === Apply global alpha ===
  ctx.save();
  ctx.globalAlpha = alpha;

  // === Draw background ===
  ctx.beginPath();
  ctx.fillStyle = effectiveFillColor;
  ctx.strokeStyle = effectiveBorderColor;
  ctx.lineWidth = 1 * uiScale;
  ctx.roundRect(x, y, scaledWidth, scaledHeight, r);
  ctx.fill();
  ctx.stroke();

  // === Draw icon or label ===
  if (iconCanvas) {
    const iconWidth = iconCanvas.width * uiScale;
    const iconHeight = iconCanvas.height * uiScale;

    const iconMaxWidth = scaledWidth * 0.6;
    const iconMaxHeight = scaledHeight * 0.6;

    const scaleFactor = Math.min(iconMaxWidth / iconWidth, iconMaxHeight / iconHeight, 1);

    const drawWidth = iconWidth * scaleFactor;
    const drawHeight = iconHeight * scaleFactor;

    const drawX = x + (scaledWidth - drawWidth) / 2;
    const drawY = y + (scaledHeight - drawHeight) / 2;

    ctx.drawImage(iconCanvas, drawX, drawY, drawWidth, drawHeight);
  } else {
    ctx.fillStyle = textColor;
    ctx.font = `${Math.round(drawFontSize)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + scaledWidth / 2, y + scaledHeight / 2);
  }

  ctx.restore();
}
