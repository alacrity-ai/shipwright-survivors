// src/ui/primitives/CRTBox.ts

import { addAlphaToHex } from '@/shared/colorUtils';

interface CRTBoxStyle {
  backgroundColor?: string;
  borderColor?: string;
  glow?: boolean;
  scanlineIntensity?: number; // [0, 1]
  cornerBevel?: boolean;
  chromaticAberration?: boolean;
}

/**
 * Renders a CRT-style beveled box with scanlines, glow, and chromatic aberration.
 *
 * @param ctx - Canvas 2D rendering context
 * @param opts - Box parameters
 * @param uiScale - UI scaling factor for visual fidelity (not position)
 */
export function drawCRTBox(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    style?: CRTBoxStyle;
  },
  uiScale: number = 1.0
): void {
  const {
    x, y,
    width, height,
    style = {},
  } = opts;

  const {
    backgroundColor = '#0a0a0a',
    borderColor = '#00ff41',
    glow = true,
    scanlineIntensity = 0.3,
    cornerBevel = true,
    chromaticAberration = true,
  } = style;

  const scaledWidth = width * uiScale;
  const scaledHeight = height * uiScale;

  const bevelSize = Math.min(3, height * 0.2); // Unscaled: fixed appearance

  // === Clipping Path ===
  ctx.save();
  if (cornerBevel) {
    ctx.beginPath();
    ctx.moveTo(x + bevelSize, y);
    ctx.lineTo(x + scaledWidth - bevelSize, y);
    ctx.lineTo(x + scaledWidth, y + bevelSize);
    ctx.lineTo(x + scaledWidth, y + scaledHeight - bevelSize);
    ctx.lineTo(x + scaledWidth - bevelSize, y + scaledHeight);
    ctx.lineTo(x + bevelSize, y + scaledHeight);
    ctx.lineTo(x, y + scaledHeight - bevelSize);
    ctx.lineTo(x, y + bevelSize);
    ctx.closePath();
    ctx.clip();
  }

  // === Background Gradient ===
  const gradient = ctx.createLinearGradient(x, y, x, y + scaledHeight);
  gradient.addColorStop(0.0, addAlphaToHex(backgroundColor, 'ff'));
  gradient.addColorStop(0.5, addAlphaToHex(backgroundColor, 'cc'));
  gradient.addColorStop(1.0, addAlphaToHex(backgroundColor, 'ff'));
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, scaledWidth, scaledHeight);

  // === Scanlines ===
  if (scanlineIntensity > 0) {
    ctx.fillStyle = `rgba(255,255,255,${scanlineIntensity * 0.05})`;
    for (let i = 0; i < scaledHeight; i += 2 * uiScale) {
      ctx.fillRect(x, y + i, scaledWidth, uiScale);
    }
  }

  ctx.restore();

  // === Outer Border & Glow ===
  if (glow) {
    ctx.save();
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 10 * uiScale;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2 * uiScale;

    if (cornerBevel) {
      ctx.beginPath();
      ctx.moveTo(x + bevelSize, y);
      ctx.lineTo(x + scaledWidth - bevelSize, y);
      ctx.lineTo(x + scaledWidth, y + bevelSize);
      ctx.lineTo(x + scaledWidth, y + scaledHeight - bevelSize);
      ctx.lineTo(x + scaledWidth - bevelSize, y + scaledHeight);
      ctx.lineTo(x + bevelSize, y + scaledHeight);
      ctx.lineTo(x, y + scaledHeight - bevelSize);
      ctx.lineTo(x, y + bevelSize);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(x, y, scaledWidth, scaledHeight);
    }

    ctx.restore();
  }

  // === Chromatic Aberration Borders ===
  if (chromaticAberration) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 1 * uiScale;

    ctx.strokeStyle = '#ff0000';
    ctx.strokeRect(x - 0.5 * uiScale, y, scaledWidth, scaledHeight);

    ctx.strokeStyle = '#0000ff';
    ctx.strokeRect(x + 0.5 * uiScale, y, scaledWidth, scaledHeight);

    ctx.restore();
  }

  // === Highlighted Inner Border ===
  ctx.save();
  ctx.strokeStyle = `${borderColor}40`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1 * uiScale, y + 1 * uiScale, scaledWidth - 2 * uiScale, scaledHeight - 2 * uiScale);
  ctx.restore();
}
