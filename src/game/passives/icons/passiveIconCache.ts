// src/game/passives/icons/passiveIconCache.ts

import { createCanvas, drawIconBase } from '@/game/ship/skills/icons/helpers/drawIconBase'; // Borrowed from ship skills

/**
 * Passive Icon Cache
 * - Uniform 24x24 canvas sprites (same as ship skill tree cache)
 * - Minimal initial set; extensible via initializePassiveIconCache()
 */

let iconCache: Record<string, HTMLCanvasElement> | null = null;

/** Magenta error-tile fallback (visible in dev) */
const fallbackSprite: HTMLCanvasElement = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ff00ff';
  ctx.fillRect(0, 0, 24, 24);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 22, 22);
  return canvas;
})();

/** === Icon Drawers (24x24) ===
 * Shapes are deliberately simple, bold, and readable at small size.
 * Colors chosen per spec; tweak as your palette evolves.
 */

// 🔴 Damage (red): pointed wedge/arrowhead
function getDamageIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#ff4545', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 7, cy + 6);
    ctx.lineTo(cx - 7, cy + 6);
    ctx.closePath();
  });

  // inner cut to read cleaner
  ctx.fillStyle = '#00000055';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 2);
  ctx.lineTo(cx + 4, cy + 4);
  ctx.lineTo(cx - 4, cy + 4);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

// 🔵 Armor (blue): shield silhouette
function getArmorIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#3aa0ff', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 6, cy - 2);
    ctx.lineTo(cx + 5, cy + 4);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 5, cy + 4);
    ctx.lineTo(cx - 6, cy - 2);
    ctx.closePath();
  });

  // crest line
  ctx.strokeStyle = '#0b2b66';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5);
  ctx.lineTo(cx, cy + 6);
  ctx.stroke();

  return canvas;
}

// 🟠 Thrust (orange): triple chevrons
function getThrustIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#ff9933', (ctx) => {
    const drawChevron = (y: number) => {
      ctx.beginPath();
      ctx.moveTo(cx - 6, y);
      ctx.lineTo(cx, y - 4);
      ctx.lineTo(cx + 6, y);
      ctx.lineTo(cx, y + 4);
      ctx.closePath();
      ctx.fill();
    };
    drawChevron(cy - 5);
    drawChevron(cy);
    drawChevron(cy + 5);
  }, 'fill', true);

  return canvas;
}

// 🟣 Block Drop Rate (purple): stacked squares “falling”
function getBlockDropRateIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#a066ff', (ctx) => {
    const rect = (x: number, y: number, s: number) => {
      ctx.beginPath();
      ctx.rect(x, y, s, s);
      ctx.fill();
    };
    rect(5, 6, 6);   // top “block”
    rect(10, 11, 6); // mid “block” (offset)
    rect(13, 16, 6); // bottom “block”
  });

  // motion accents
  ctx.strokeStyle = '#3b1a75';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(9, 9); ctx.lineTo(9, 7);
  ctx.moveTo(14, 14); ctx.lineTo(14, 12);
  ctx.moveTo(17, 19); ctx.lineTo(17, 17);
  ctx.stroke();

  return canvas;
}

// 🟢 Harvest (green): circle with inward arrows
function getHarvestIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#2ecc71', (ctx) => {
    // outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#155e34';
    ctx.lineWidth = 2;
    ctx.stroke();

    // inward arrows (N/E/S/W)
    const arrow = (dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx * 9, cy + dy * 9);
      ctx.lineTo(cx + dx * 3, cy + dy * 3);
      // wings
      ctx.lineTo(cx + dx * 5 + dy * 2, cy + dy * 5 - dx * 2);
      ctx.moveTo(cx + dx * 3, cy + dy * 3);
      ctx.lineTo(cx + dx * 5 - dy * 2, cy + dy * 5 + dx * 2);
      ctx.stroke();
    };
    ctx.strokeStyle = '#155e34';
    ctx.lineWidth = 2;
    arrow(0, -1);
    arrow(1, 0);
    arrow(0, 1);
    arrow(-1, 0);
  }, 'stroke', false);

  return canvas;
}

// 🟣 Ability (light powder purple): spark/star glyph
function getAbilityIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#cdb9ff', (ctx) => {
    ctx.beginPath();
    // 8-point star
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      const r1 = 8, r2 = 3;
      const x1 = cx + Math.cos(a) * r1;
      const y1 = cy + Math.sin(a) * r1;
      const x2 = cx + Math.cos(a + Math.PI / 8) * r2;
      const y2 = cy + Math.sin(a + Math.PI / 8) * r2;
      if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
  }, 'fill', true);

  // core dot
  ctx.fillStyle = '#7e68c9';
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

/** Public API */

// Initialize once; idempotent
export function initializePassiveIconCache(): void {
  if (iconCache) return;

  iconCache = {
    // Required initial set
    'icon-damage': getDamageIconSprite(),
    'icon-armor': getArmorIconSprite(),
    'icon-thrust': getThrustIconSprite(),
    'icon-blockDropRate': getBlockDropRateIconSprite(),
    'icon-harvest': getHarvestIconSprite(),
    'icon-ability': getAbilityIconSprite(),

    // Explicit fallback registration (optional external usage)
    'icon-fallback': fallbackSprite,
  };
}

export function destroyPassiveIconCache(): void {
  iconCache = null;
}

/**
 * Resolves a cached passive icon sprite for the given key.
 * Returns a high-contrast fallback if uninitialized or missing.
 */
export function resolvePassiveIconSprite(icon: string): HTMLCanvasElement {
  if (!iconCache) {
    console.warn(`[PassiveIconCache] Attempted to resolve before initialization: ${icon}`);
    return fallbackSprite;
  }
  const sprite = iconCache[icon];
  if (!sprite) {
    console.warn(`[PassiveIconCache] Unrecognized icon key: ${icon}`);
    return iconCache['icon-fallback'] ?? fallbackSprite;
  }
  return sprite;
}
