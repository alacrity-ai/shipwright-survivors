// src/game/ship/skills/icons/sw1/SW1IconSprites.ts

import { createCanvas, drawIconBase } from '@/game/ship/skills/icons/helpers/drawIconBase';

// === 🔴 CORE DAMAGE (major) ===
export function getCoreDamageIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#ff3333', (ctx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  });

  // Cross inside
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy);
  ctx.lineTo(cx + 4, cy);
  ctx.moveTo(cx, cy - 4);
  ctx.lineTo(cx, cy + 4);
  ctx.stroke();

  return canvas;
}

// === 🔷 SPLITSHOT MATRIX (major) ===
export function getSplitshotMatrixIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12;
  const cy = 12;
  const lineHeight = 6;
  const spacing = 4;

  drawIconBase(
    ctx,
    '#33ccff',
    (ctx) => {
      // Left vertical line
      ctx.beginPath();
      ctx.moveTo(cx - spacing, cy - lineHeight);
      ctx.lineTo(cx - spacing, cy + lineHeight);
      ctx.stroke();

      // Right vertical line
      ctx.beginPath();
      ctx.moveTo(cx + spacing, cy - lineHeight);
      ctx.lineTo(cx + spacing, cy + lineHeight);
      ctx.stroke();
    },
    'stroke',
    false // No black outline
  );

  return canvas;
}


// === 🟣 PENETRATING AMMO (major) ===
export function getPenetratingAmmoIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12;
  const cy = 12;

  drawIconBase(
    ctx,
    '#b266ff',
    (ctx) => {
      // === Penetrating Line ===
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx + 8, cy);
      ctx.stroke();

      // === Circle break (target) ===
      const r = 4.5;

      // Left arc (entry wound)
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.3, Math.PI * 1.2, false);
      ctx.stroke();

      // Right arc (exit wound)
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 1.8, Math.PI * 0.7, false);
      ctx.stroke();
    },
    'stroke',
    false // No black outline
  );

  return canvas;
}


// === 🔺 DAMAGE BOOST (major) ===
export function getDamageBoostIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#ff5050', (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 6, cy + 5);
    ctx.lineTo(cx - 6, cy + 5);
    ctx.closePath();
  });

  return canvas;
}

// === ✴ CRITICAL HIT (minor) ===
export function getCriticalHitIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(
    ctx,
    '#7e007e',
    (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 5);
      ctx.lineTo(cx + 5, cy + 5);
      ctx.moveTo(cx + 5, cy - 5);
      ctx.lineTo(cx - 5, cy + 5);
    },
    'stroke',
    false // ✴ No black outline
  );

  return canvas;
}


// === ➤ PROJECTILE SPEED (minor) ===
export function getProjectileSpeedIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#00e6e6', (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 4);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx - 6, cy + 4);
    ctx.closePath();
  });

  return canvas;
}

export function getTurretBlockIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12;
  const cy = 12;

  drawIconBase(ctx, '#cccc00', (ctx: CanvasRenderingContext2D) => {
    // === TURRET BASE ===
    ctx.beginPath();
    ctx.rect(cx - 6, cy + 2, 12, 6); // base block
    ctx.closePath();

    // === BARREL ===
    ctx.moveTo(cx - 2, cy - 6);
    ctx.lineTo(cx + 2, cy - 6);
    ctx.lineTo(cx + 2, cy + 2);
    ctx.lineTo(cx - 2, cy + 2);
    ctx.closePath();
  });

  return canvas;
}
