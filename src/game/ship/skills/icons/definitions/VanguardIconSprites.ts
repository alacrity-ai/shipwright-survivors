// src/game/ship/skills/icons/vanguard/VanguardIconSprites.ts

import { createCanvas, drawIconBase } from '@/game/ship/skills/icons/helpers/drawIconBase';

const ICON_SIZE = 24;
const cx = 12;
const cy = 12;

// === 🔥 Volatile Payload (ignite-on-hit) ===
export function getExplosionFireIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  const cx = ICON_SIZE / 2;
  const cy = ICON_SIZE / 2;

  drawIconBase(
    ctx,
    '#ff6633',
    (ctx) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);           // Tip of flame
      ctx.bezierCurveTo(cx + 4, cy - 2, cx + 3, cy + 4, cx, cy + 6);   // Right flame curve
      ctx.bezierCurveTo(cx - 3, cy + 4, cx - 4, cy - 2, cx, cy - 6);   // Left flame curve
      ctx.closePath();
      ctx.stroke();
    },
    'stroke',
    false // No black outline
  );

  return canvas;
}


// === 🧊 Cryo Detonation (freeze-on-hit) ===
export function getTimeFreezeIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  const cx = ICON_SIZE / 2;
  const cy = ICON_SIZE / 2;

  drawIconBase(
    ctx,
    '#66ccff',
    (ctx) => {
      const width = 6;
      const height = 8;

      // Top triangle
      ctx.beginPath();
      ctx.moveTo(cx - width / 2, cy - height / 2);
      ctx.lineTo(cx + width / 2, cy - height / 2);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.stroke();

      // Bottom triangle
      ctx.beginPath();
      ctx.moveTo(cx - width / 2, cy + height / 2);
      ctx.lineTo(cx + width / 2, cy + height / 2);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.stroke();

      // Optional caps: top and bottom
      ctx.beginPath();
      ctx.moveTo(cx - width / 2, cy - height / 2 - 1);
      ctx.lineTo(cx + width / 2, cy - height / 2 - 1);
      ctx.moveTo(cx - width / 2, cy + height / 2 + 1);
      ctx.lineTo(cx + width / 2, cy + height / 2 + 1);
      ctx.stroke();
    },
    'stroke',
    false // No black outline
  );

  return canvas;
}


// === 💥 Overloaded Warheads (+radius & double shot) ===
export function getDoubleRadiusIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  const cx = ICON_SIZE / 2;
  const cy = ICON_SIZE / 2;

  drawIconBase(
    ctx,
    '#ff3366', // Intense reddish-magenta
    (ctx) => {
      const len = 6;

      // Vertical spike
      ctx.beginPath();
      ctx.moveTo(cx, cy - len);
      ctx.lineTo(cx, cy + len);
      ctx.stroke();

      // Horizontal spike
      ctx.beginPath();
      ctx.moveTo(cx - len, cy);
      ctx.lineTo(cx + len, cy);
      ctx.stroke();

      // Diagonal ↘︎↖︎
      ctx.beginPath();
      ctx.moveTo(cx - len * 0.7, cy - len * 0.7);
      ctx.lineTo(cx + len * 0.7, cy + len * 0.7);
      ctx.stroke();

      // Diagonal ↙︎↗︎
      ctx.beginPath();
      ctx.moveTo(cx - len * 0.7, cy + len * 0.7);
      ctx.lineTo(cx + len * 0.7, cy - len * 0.7);
      ctx.stroke();
    },
    'stroke',
    false // No black outline
  );

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
