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
