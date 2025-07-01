// src/game/ship/skills/icons/vanguard/VanguardIconSprites.ts

import { createCanvas, drawIconBase } from '@/game/ship/skills/icons/helpers/drawIconBase';

const ICON_SIZE = 24;
const cx = 12;
const cy = 12;

// === 🔥 Volatile Payload (ignite-on-hit) ===
export function getExplosionFireIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#ff6633', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 4, cy + 5);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 4, cy + 5);
    ctx.closePath();
  });

  return canvas;
}

// === 🧊 Cryo Detonation (freeze-on-hit) ===
export function getTimeFreezeIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#66ccff', (ctx) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 6 * Math.cos(angle), cy + 6 * Math.sin(angle));
    }
    ctx.moveTo(cx - 3, cy);
    ctx.lineTo(cx + 3, cy);
  });

  return canvas;
}

// === 💥 Overloaded Warheads (+radius & double shot) ===
export function getDoubleRadiusIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#cc99ff', (ctx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.moveTo(cx + 4, cy);
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  });

  return canvas;
}

// === 🔫 Deployed Seeker Block ===
export function getSeekerMissileIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#cccc00', (ctx) => {
    ctx.beginPath();
    ctx.rect(cx - 5, cy + 2, 10, 6); // base
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 2, cy + 2);
    ctx.lineTo(cx - 2, cy + 2);
    ctx.closePath();
  });

  return canvas;
}

// === 🚀 Missile Damage ===
export function getMissileDamageIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#ff6666', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 4);
    ctx.lineTo(cx + 3, cy);
    ctx.lineTo(cx - 3, cy + 4);
    ctx.closePath();
  });

  return canvas;
}

// === 🌀 Double Shot Chance ===
export function getDoubleShotIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#66ff66', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 4);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.moveTo(cx + 4, cy - 4);
    ctx.lineTo(cx - 4, cy);
    ctx.lineTo(cx + 4, cy + 4);
  });

  return canvas;
}

// === 🌐 Explosion Radius ===
export function getBlastRadiusIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;

  drawIconBase(ctx, '#00e6e6', (ctx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.moveTo(cx + 4, cy);
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  });

  return canvas;
}
