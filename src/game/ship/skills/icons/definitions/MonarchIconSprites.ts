// src/game/ship/skills/icons/monarch/MonarchIconSprites.ts

import { createCanvas, drawIconBase } from '@/game/ship/skills/icons/helpers/drawIconBase';

const ICON_SIZE = 24;
const cx = 12;
const cy = 12;

// === 🧲 Grappling Lance (major) ===
export function getLanceGrappleIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#33ccff', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy);
    ctx.lineTo(cx, cy - 5);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.closePath();
  });
  return canvas;
}

// === ⚡ Electroshock Core (major) ===
export function getLanceElectrocuteIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#66ffff', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 5);
    ctx.lineTo(cx + 1, cy - 2);
    ctx.lineTo(cx - 1, cy + 2);
    ctx.lineTo(cx + 5, cy + 5);
  });
  return canvas;
}

// === 🩸 Vampiric Lance (major) ===
export function getLanceLifestealIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#cc3366', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.bezierCurveTo(cx + 6, cy - 6, cx + 6, cy + 4, cx, cy + 6);
    ctx.bezierCurveTo(cx - 6, cy + 4, cx - 6, cy - 6, cx, cy - 6);
    ctx.closePath();
  });
  return canvas;
}

// === 💣 Lance Damage (minor) ===
export function getLanceDamageIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#ff6666', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.lineTo(cx - 5, cy + 5);
    ctx.closePath();
  });
  return canvas;
}

// === 🔁 Lance Firing Rate (minor) ===
export function getLanceRateIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#ffcc00', (ctx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, Math.PI * 0.25, Math.PI * 1.75);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 6, cy - 1);
  });
  return canvas;
}

// === 📡 Lance Range (minor) ===
export function getLanceRangeIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#00e6e6', (ctx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.moveTo(cx + 4, cy);
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.moveTo(cx + 2, cy);
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  });
  return canvas;
}

// === 🔨 Deployed Lance (minor) ===
export function getLanceBlockIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#cccc00', (ctx) => {
    ctx.beginPath();
    ctx.rect(cx - 5, cy + 2, 10, 6);
    ctx.moveTo(cx - 1, cy - 6);
    ctx.lineTo(cx + 1, cy - 6);
    ctx.lineTo(cx + 1, cy + 2);
    ctx.lineTo(cx - 1, cy + 2);
    ctx.closePath();
  });
  return canvas;
}
