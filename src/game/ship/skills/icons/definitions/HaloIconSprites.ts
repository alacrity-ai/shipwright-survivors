// src/game/ship/skills/icons/halo/HaloIconSprites.ts

import { createCanvas, drawIconBase } from '@/game/ship/skills/icons/helpers/drawIconBase';

const ICON_SIZE = 24;
const cx = 12;
const cy = 12;

// === 💥 Detonating Orbit (major) ===
export function getBladeDetonateIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  const cx = ICON_SIZE / 2;
  const cy = ICON_SIZE / 2;

  drawIconBase(
    ctx,
    '#ff3333',
    (ctx) => {
      const spikeCount = 8;
      const innerRadius = 3;
      const outerRadius = 8;

      for (let i = 0; i < spikeCount; i++) {
        const angle = (2 * Math.PI / spikeCount) * i;
        const x1 = cx + innerRadius * Math.cos(angle);
        const y1 = cy + innerRadius * Math.sin(angle);
        const x2 = cx + outerRadius * Math.cos(angle + Math.PI / spikeCount);
        const y2 = cy + outerRadius * Math.sin(angle + Math.PI / spikeCount);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    },
    'stroke',
    false // No black outline
  );

  return canvas;
}

// === ❄ Cryogenic Blade (major) ===
export function getBladeFreezeIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  const cx = ICON_SIZE / 2;
  const cy = ICON_SIZE / 2;

  drawIconBase(
    ctx,
    '#66ccff',
    (ctx) => {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x1 = cx + 7 * Math.cos(angle);
        const y1 = cy + 7 * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        // Small side branches (snowflake arms)
        const sideAngle1 = angle - Math.PI / 12;
        const sideAngle2 = angle + Math.PI / 12;
        const branchLength = 3;

        const bx = cx + 4 * Math.cos(angle);
        const by = cy + 4 * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + branchLength * Math.cos(sideAngle1), by + branchLength * Math.sin(sideAngle1));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + branchLength * Math.cos(sideAngle2), by + branchLength * Math.sin(sideAngle2));
        ctx.stroke();
      }
    },
    'stroke',
    false // No black outline
  );

  return canvas;
}

// === ⚡ Split Blades (major) ===
export function getBladeSplitIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d')!;
  const cx = ICON_SIZE / 2;
  const cy = ICON_SIZE / 2;

  drawIconBase(
    ctx,
    '#cc66ff',
    (ctx) => {
      const diamondSize = 4;
      const spacing = 5;

      const leftX = cx - spacing;
      const rightX = cx + spacing;

      // Left diamond
      ctx.beginPath();
      ctx.moveTo(leftX, cy - diamondSize); // top
      ctx.lineTo(leftX + diamondSize, cy); // right
      ctx.lineTo(leftX, cy + diamondSize); // bottom
      ctx.lineTo(leftX - diamondSize, cy); // left
      ctx.closePath();
      ctx.stroke();

      // Right diamond
      ctx.beginPath();
      ctx.moveTo(rightX, cy - diamondSize); // top
      ctx.lineTo(rightX + diamondSize, cy); // right
      ctx.lineTo(rightX, cy + diamondSize); // bottom
      ctx.lineTo(rightX - diamondSize, cy); // left
      ctx.closePath();
      ctx.stroke();
    },
    'stroke',
    false // ❌ No black outline
  );

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
