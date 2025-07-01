// src/game/ship/skills/icons/godhand/GodhandIconSprites.ts

import { createCanvas, drawIconBase } from '@/game/ship/skills/icons/helpers/drawIconBase';

const ICON_SIZE = 24;
const cx = 12;
const cy = 12;

// === 🛡️ Laser Shield Penetration (major) ===
export function getLaserPenetrateIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  const cx = ICON_SIZE / 2;
  const cy = ICON_SIZE / 2;

  drawIconBase(
    ctx,
    '#3399ff',
    (ctx) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 7);                  // Top point
      ctx.lineTo(cx + 6, cy - 2);              // Upper right
      ctx.lineTo(cx + 4, cy + 6);              // Lower right
      ctx.lineTo(cx, cy + 8);                  // Bottom center
      ctx.lineTo(cx - 4, cy + 6);              // Lower left
      ctx.lineTo(cx - 6, cy - 2);              // Upper left
      ctx.closePath();                         // Back to top
      ctx.stroke();
    },
    'stroke',
    false // No black outline
  );

  return canvas;
}

// === 🎯 Laser Targeting (major) ===
export function getLaserTargetingIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  const cx = ICON_SIZE / 2;
  const cy = ICON_SIZE / 2;

  drawIconBase(
    ctx,
    '#66ccff',
    (ctx) => {
      const outerRadius = 6;
      const tickLength = 2.5;

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Horizontal ticks
      ctx.beginPath();
      ctx.moveTo(cx - outerRadius, cy);
      ctx.lineTo(cx - outerRadius + tickLength, cy);
      ctx.moveTo(cx + outerRadius, cy);
      ctx.lineTo(cx + outerRadius - tickLength, cy);
      ctx.stroke();

      // Vertical ticks
      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      ctx.lineTo(cx, cy - outerRadius + tickLength);
      ctx.moveTo(cx, cy + outerRadius);
      ctx.lineTo(cx, cy + outerRadius - tickLength);
      ctx.stroke();

      // Optional: Inner dot
      ctx.beginPath();
      ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
      ctx.stroke();
    },
    'stroke',
    false // No black outline
  );

  return canvas;
}


// === 🔫 Deployed Laser (minor) ===
export function getLaserBlockIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#cccc00', (ctx) => {
    // Base block
    ctx.beginPath();
    ctx.rect(cx - 6, cy + 2, 12, 6);
    ctx.closePath();

    // Vertical barrel
    ctx.moveTo(cx - 2, cy - 6);
    ctx.lineTo(cx + 2, cy - 6);
    ctx.lineTo(cx + 2, cy + 2);
    ctx.lineTo(cx - 2, cy + 2);
    ctx.closePath();
  });

  return canvas;
}

// === 🔺 Laser Damage (minor) ===
export function getLaserDamageIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#ff5050', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.lineTo(cx - 5, cy + 5);
    ctx.closePath();
  });

  return canvas;
}

// === 📏 Beam Width (minor) ===
export function getLaserWidthIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#ffa500', (ctx) => {
    ctx.beginPath();
    ctx.rect(cx - 5, cy - 3, 10, 6);
    ctx.closePath();
  });

  return canvas;
}

// === ⚙️ Efficiency (minor) ===
export function getLaserEfficiencyIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  const cx = ICON_SIZE / 2;
  const cy = ICON_SIZE / 2;

  drawIconBase(
    ctx,
    '#33cc99',
    (ctx) => {
      const bodyWidth = 10;
      const bodyHeight = 6;
      const terminalWidth = 4;
      const terminalHeight = 2;

      // Battery body
      const x = cx - bodyWidth / 2;
      const y = cy - bodyHeight / 2;
      ctx.beginPath();
      ctx.rect(x, y, bodyWidth, bodyHeight);
      ctx.stroke();

      // Terminal
      const tx = cx - terminalWidth / 2;
      const ty = y - terminalHeight;
      ctx.beginPath();
      ctx.rect(tx, ty, terminalWidth, terminalHeight);
      ctx.stroke();

      // Optional charge bar
      ctx.beginPath();
      ctx.moveTo(x + 2, y + bodyHeight / 2);
      ctx.lineTo(x + bodyWidth - 2, y + bodyHeight / 2);
      ctx.stroke();
    },
    'stroke',
    false // No black outline
  );

  return canvas;
}

