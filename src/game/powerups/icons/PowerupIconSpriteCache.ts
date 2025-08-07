// src/game/powerups/icons/PowerupIconSpriteCache.ts

import { getFallbackCoreIconSprite } from './getFallbackCoreIconSprite';

/**
 * This module provides lightweight, canvas-based placeholder sprites
 * for powerup icons. These are used in menus and overlays until
 * full icon assets are introduced.
 */

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function drawIconBase(
  ctx: CanvasRenderingContext2D,
  backgroundColor: string,
  shapeDrawer: (ctx: CanvasRenderingContext2D) => void
): void {
  // Background glow
  ctx.shadowBlur = 8;
  ctx.shadowColor = backgroundColor;
  ctx.fillStyle = backgroundColor;
  shapeDrawer(ctx);
  ctx.fill();

  // Outline
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  shapeDrawer(ctx);
  ctx.stroke();
}

// === ⚔️ Attack Icon ===
const attackIcon = createCanvas(24, 24);
{
  const ctx = attackIcon.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#ff3c3c', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 6, cy + 6);
    ctx.lineTo(cx - 6, cy + 6);
    ctx.closePath();
  });
}

export function getAttackIconSprite(): HTMLCanvasElement {
  return attackIcon;
}

// === 🔥 Critical Hit Icon ===

export function getCriticalHitIconSprite(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 24, 24);

  const cx = 12;
  const cy = 12;

  // === OUTER BURST ===
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const x = cx + Math.cos(angle) * 10;
    const y = cy + Math.sin(angle) * 10;
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  // === PURPLE GLOW LINES ===
  ctx.strokeStyle = '#b000f0';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#cc66ff';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const x = cx + Math.cos(angle) * 10;
    const y = cy + Math.sin(angle) * 10;
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  // === INNER CORE ===
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#e0aaff';
  ctx.beginPath();
  ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  return canvas;
}

export function getCriticalSurgeIconSprite(): HTMLCanvasElement {
  return getCriticalHitIconSprite();
}

// === 🛡️ Defense Icon ===
const defenseIcon = createCanvas(24, 24);
{
  const ctx = defenseIcon.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#3cc2ff', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 6, cy);
    ctx.closePath();
  });
}

export function getDefenseIconSprite(): HTMLCanvasElement {
  return defenseIcon;
}

// === 🧪 Utility Icon ===
const utilityIcon = createCanvas(24, 24);
{
  const ctx = utilityIcon.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#adff2f', (ctx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  });
}

export function getUtilityIconSprite(): HTMLCanvasElement {
  return utilityIcon;
}

// 1 ▪ helper ────────────────────────────────────────────────────────────────
function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
}

// 2 ▪ Affinity-Block base icon ─────────────────────────────────────────────
const affinityBlockIcon = createCanvas(24, 24);
{
  const ctx = affinityBlockIcon.getContext('2d')!;
  drawIconBase(ctx, '#ffdb66', (c) => drawDiamond(c, 12, 12, 7));
}
export function getAffinityBlockIconSprite(): HTMLCanvasElement {
  return affinityBlockIcon;
}

// 3 ▪ Affinity-Block capstone icon ─────────────────────────────────────────
const affinityBlockCapIcon = createCanvas(24, 24);
{
  const ctx = affinityBlockCapIcon.getContext('2d')!;
  // outer glow diamond
  drawIconBase(ctx, '#ffd700', (c) => drawDiamond(c, 12, 12, 8));

  // inner highlight diamond
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#ffa500';
  ctx.fillStyle = '#fff2b0';
  drawDiamond(ctx, 12, 12, 4);
  ctx.fill();
  ctx.shadowBlur = 0;
}
export function getAffinityBlockCapstoneIconSprite(): HTMLCanvasElement {
  return affinityBlockCapIcon;
}

// ───────────────────────────────────────────────────────────────────────────
// 4 ▪ Resupply icons ─ minimalist crates & cache labels
// ───────────────────────────────────────────────────────────────────────────
function drawCrate(ctx: CanvasRenderingContext2D, glow: string): void {
  // Outer glow + square
  drawIconBase(ctx, glow, (c) => {
    c.beginPath();
    c.rect(4, 4, 16, 16);
  });

  // Inner “X” straps
  ctx.strokeStyle = '#2b1a00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(6, 6);
  ctx.lineTo(18, 18);
  ctx.moveTo(18, 6);
  ctx.lineTo(6, 18);
  ctx.stroke();
}

/* 4-A ▪ Tier-1–4 ‘crate’ (generic drop) */
const resupplyCrateIcon = createCanvas(24, 24);
drawCrate(resupplyCrateIcon.getContext('2d')!, '#00d8d8');
export function getResupplyCrateIconSprite(): HTMLCanvasElement {
  return resupplyCrateIcon;
}

/* 4-B ▪ Tier-5 ‘elite’ cache */
const resupplyEliteIcon = createCanvas(24, 24);
drawCrate(resupplyEliteIcon.getContext('2d')!, '#ff9c1a');
export function getResupplyEliteIconSprite(): HTMLCanvasElement {
  return resupplyEliteIcon;
}

/* 4-C ▪ Capstone cache (double-border + glow) */
const resupplyCapIcon = createCanvas(24, 24);
{
  const ctx = resupplyCapIcon.getContext('2d')!;
  drawCrate(ctx, '#ffde3c');
  // Inner border highlight
  ctx.strokeStyle = '#fff5b0';
  ctx.lineWidth = 1;
  ctx.strokeRect(6, 6, 12, 12);
}
export function getResupplyCapstoneIconSprite(): HTMLCanvasElement {
  return resupplyCapIcon;
}

// ───────────────────────────────────────────────────────────────────────────
// Weapon resupply crates — red hue variants
// ───────────────────────────────────────────────────────────────────────────

/**
 * Tier 1 – Basic weapon crate
 * Crimson glow with X-straps
 */
const weaponResupplyCrateIcon = createCanvas(24, 24);
drawCrate(weaponResupplyCrateIcon.getContext('2d')!, '#d83100');
export function getWeaponResupplyCrateIconSprite(): HTMLCanvasElement {
  return weaponResupplyCrateIcon;
}

/**
 * Tier 5 – Elite weapon cache
 * Bright orange-red glow, same structure
 */
const weaponResupplyEliteIcon = createCanvas(24, 24);
drawCrate(weaponResupplyEliteIcon.getContext('2d')!, '#ff3f0f');
export function getWeaponResupplyEliteIconSprite(): HTMLCanvasElement {
  return weaponResupplyEliteIcon;
}

/**
 * Capstone – Weapon apex cache
 * Pale red glow with extra inner highlight
 */
const weaponResupplyCapIcon = createCanvas(24, 24);
{
  const ctx = weaponResupplyCapIcon.getContext('2d')!;
  drawCrate(ctx, '#ff6565'); // Pale red
  ctx.strokeStyle = '#ffe1e1'; // Soft highlight
  ctx.lineWidth = 1;
  ctx.strokeRect(6, 6, 12, 12);
}
export function getWeaponResupplyCapstoneIconSprite(): HTMLCanvasElement {
  return weaponResupplyCapIcon;
}


// === Icon Registry Map ===
const iconMap: Record<string, () => HTMLCanvasElement> = {
  'icon-attackers-arsenal': getAttackIconSprite,
  'icon-rapid-fire': getAttackIconSprite,
  'icon-deadly-damage': getAttackIconSprite,

  'icon-critical-hit': getCriticalHitIconSprite,
  'icon-critical-surge': getCriticalSurgeIconSprite,
  'icon-blood-pact': getCriticalHitIconSprite,

  'icon-fortress-builder': getDefenseIconSprite,
  'icon-shield-fortification': getDefenseIconSprite,
  'icon-thorn-plating': getDefenseIconSprite,

  'icon-utility-default': getUtilityIconSprite,

  'icon-affinity-block': getAffinityBlockIconSprite,
  'icon-affinity-block-capstone': getAffinityBlockCapstoneIconSprite,

  'icon-resupply-crate':    getResupplyCrateIconSprite,
  'icon-resupply-elite':    getResupplyEliteIconSprite,
  'icon-resupply-capstone': getResupplyCapstoneIconSprite,

  'icon-weapon-crate':    getWeaponResupplyCrateIconSprite,
  'icon-weapon-elite':    getWeaponResupplyEliteIconSprite,
  'icon-weapon-capstone': getWeaponResupplyCapstoneIconSprite,

  'icon-core-reward': getFallbackCoreIconSprite,
};

// === Fallback Sprite ===
const fallbackSprite = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'magenta';
  ctx.fillRect(0, 0, 24, 24);
  ctx.strokeStyle = 'black';
  ctx.strokeRect(0, 0, 24, 24);
  return canvas;
})();

/**
 * Resolves a cached powerup icon sprite for a given `PowerupNodeDefinition.icon` string.
 * If no matching sprite is found, a fallback magenta square is returned.
 */
export function resolvePowerupIconSprite(icon: string): HTMLCanvasElement {
  const getter = iconMap[icon];
  if (!getter) {
    console.warn(`[PowerupIconSpriteCache] Unrecognized icon key: ${icon}`);
    return fallbackSprite;
  }
  return getter();
}
