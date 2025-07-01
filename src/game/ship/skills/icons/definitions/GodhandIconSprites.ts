// src/game/ship/skills/icons/godhand/GodhandIconSprites.ts

import { createCanvas, drawIconBase } from '@/game/ship/skills/icons/helpers/drawIconBase';

const ICON_SIZE = 24;
const cx = 12;
const cy = 12;

// === 🛡️ Laser Shield Penetration (major) ===
export function getLaserPenetrateIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#ff3366', (ctx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.moveTo(cx - 5, cy);
    ctx.lineTo(cx + 5, cy);
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx, cy + 5);
  });

  return canvas;
}

// === 🎯 Laser Targeting (major) ===
export function getLaserTargetingIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#66ccff', (ctx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx, cy + 6);
  });

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

  drawIconBase(ctx, '#33cc99', (ctx) => {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i;
      const x = cx + 6 * Math.cos(angle);
      const y = cy + 6 * Math.sin(angle);
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
    }
    ctx.arc(cx, cy, 2, 0, Math.PI * 2); // center core
  });

  return canvas;
}
