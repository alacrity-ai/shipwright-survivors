// src/game/ship/skills/icons/halo/HaloIconSprites.ts

import { createCanvas, drawIconBase } from '@/game/ship/skills/icons/helpers/drawIconBase';

const ICON_SIZE = 24;
const cx = 12;
const cy = 12;

// === 💥 Detonating Orbit (major) ===
export function getBladeDetonateIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#ff3333', (ctx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.moveTo(cx - 5, cy - 5);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.moveTo(cx + 5, cy - 5);
    ctx.lineTo(cx - 5, cy + 5);
  });

  return canvas;
}

// === ❄ Cryogenic Blade (major) ===
export function getBladeFreezeIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#66ccff', (ctx) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 7 * Math.cos(angle), cy + 7 * Math.sin(angle));
    }
  });

  return canvas;
}

// === ⚡ Split Blades (major) ===
export function getBladeSplitIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#cc66ff', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx, cy - 6);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.closePath();
  });

  return canvas;
}

// === 🔺 Damage Nodes (minor) ===
export function getBladeDamageIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#ff6666', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.lineTo(cx - 5, cy + 5);
    ctx.closePath();
  });

  return canvas;
}

// === ⭕ Blade Size (minor) ===
export function getBladeSizeIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#ffcc33', (ctx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.moveTo(cx + 3, cy);
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  });

  return canvas;
}

// === 🪐 Orbit Radius (minor) ===
export function getBladeRadiusIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#66ffff', (ctx) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, 7, 4, 0, 0, Math.PI * 2);
    ctx.moveTo(cx - 2, cy - 1);
    ctx.arc(cx - 2, cy - 1, 1.5, 0, Math.PI * 2);
  });

  return canvas;
}

// === 🌀 Deployed Blade (minor) ===
export function getHaloBladeIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#cccc00', (ctx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.moveTo(cx - 5, cy);
    ctx.lineTo(cx + 5, cy);
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx, cy + 5);
  });

  return canvas;
}
