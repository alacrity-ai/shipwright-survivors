// src/game/ship/skills/icons/StarterShipSkillIconSpriteCache.ts

import { createCanvas, drawIconBase } from '@/game/ship/skills/icons/helpers/drawIconBase';

import {
  getCoreDamageIconSprite,
  getSplitshotMatrixIconSprite,
  getPenetratingAmmoIconSprite,
  getDamageBoostIconSprite,
  getCriticalHitIconSprite,
  getProjectileSpeedIconSprite,
  getTurretBlockIconSprite,
} from '@/game/ship/skills/icons/definitions/SW1IconSprites';

import {
  getExplosionFireIconSprite,
  getDoubleRadiusIconSprite,
  getSeekerMissileIconSprite,
  getMissileDamageIconSprite,
  getDoubleShotIconSprite,
  getBlastRadiusIconSprite,
  getTimeFreezeIconSprite,
} from '@/game/ship/skills/icons/definitions/VanguardIconSprites';

import {
  getLanceGrappleIconSprite,
  getLanceElectrocuteIconSprite,
  getLanceLifestealIconSprite,
  getLanceDamageIconSprite,
  getLanceRateIconSprite,
  getLanceRangeIconSprite,
  getLanceBlockIconSprite,
} from '@/game/ship/skills/icons/definitions/MonarchIconSprites';

import {
  getBladeDetonateIconSprite,
  getBladeFreezeIconSprite,
  getBladeSplitIconSprite,
  getBladeDamageIconSprite,
  getBladeSizeIconSprite,
  getBladeRadiusIconSprite,
  getHaloBladeIconSprite,
} from './definitions/HaloIconSprites';

import {
  getLaserDamageIconSprite,
  getLaserWidthIconSprite,
  getLaserEfficiencyIconSprite,
  getLaserPenetrateIconSprite,
  getLaserTargetingIconSprite,
  getLaserBlockIconSprite,
} from './definitions/GodhandIconSprites';

let iconCache: Record<string, HTMLCanvasElement> | null = null;

const fallbackSprite: HTMLCanvasElement = (() => {
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

function createEnergyCoreIcon(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;
  drawIconBase(ctx, '#00ffff', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 6);
    ctx.lineTo(cx + 2, cy - 2);
    ctx.lineTo(cx - 1, cy + 2);
    ctx.lineTo(cx + 4, cy + 6);
    ctx.lineTo(cx - 2, cy + 2);
    ctx.lineTo(cx + 1, cy - 2);
    ctx.closePath();
  });
  return canvas;
}

function createEngineTuningIcon(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;
  drawIconBase(ctx, '#ffaa00', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 3);
    ctx.lineTo(cx + 6, cy - 3);
    ctx.lineTo(cx + 6, cy + 3);
    ctx.lineTo(cx - 6, cy + 3);
    ctx.closePath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx, cy + 6);
  });
  return canvas;
}

function createTargetingUplinkIcon(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;
  drawIconBase(ctx, '#ff4081', (ctx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx, cy + 6);
  });
  return canvas;
}

function createEmptyMinorNodeIcon(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;
  const r = 6;
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  return canvas;
}

function createEmptyMajorNodeIcon(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;
  const r = 9;
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  return canvas;
}

export function initializeShipSkillTreeSpriteCache(): void {
  if (iconCache) return;

  iconCache = {
    // Custom icons
    'icon-energy-core': createEnergyCoreIcon(),
    'icon-engine-tuning': createEngineTuningIcon(),
    'icon-targeting-uplink': createTargetingUplinkIcon(),

    // SW1
    'icon-core-damage': getCoreDamageIconSprite(),
    'icon-splitshot-matrix': getSplitshotMatrixIconSprite(),
    'icon-penetrating-ammo': getPenetratingAmmoIconSprite(),
    'icon-damage-boost': getDamageBoostIconSprite(),
    'icon-critical-hit': getCriticalHitIconSprite(),
    'icon-projectile-speed': getProjectileSpeedIconSprite(),
    'icon-turret-block': getTurretBlockIconSprite(),

    // Vanguard
    'icon-explosion-fire': getExplosionFireIconSprite(),
    'icon-time-freeze': getTimeFreezeIconSprite(),
    'icon-double-radius': getDoubleRadiusIconSprite(),
    'icon-seeker-block': getSeekerMissileIconSprite(),
    'icon-missile-damage': getMissileDamageIconSprite(),
    'icon-double-shot': getDoubleShotIconSprite(),
    'icon-blast-radius': getBlastRadiusIconSprite(),

    // Monarch
    'icon-lance-grapple': getLanceGrappleIconSprite(),
    'icon-lance-electrocute': getLanceElectrocuteIconSprite(),
    'icon-lance-lifesteal': getLanceLifestealIconSprite(),
    'icon-lance-damage': getLanceDamageIconSprite(),
    'icon-lance-rate': getLanceRateIconSprite(),
    'icon-lance-range': getLanceRangeIconSprite(),
    'icon-lance-block': getLanceBlockIconSprite(),

    // Halo
    'icon-blade-detonate': getBladeDetonateIconSprite(),
    'icon-blade-freeze': getBladeFreezeIconSprite(),
    'icon-blade-split': getBladeSplitIconSprite(),
    'icon-blade-damage': getBladeDamageIconSprite(),
    'icon-blade-size': getBladeSizeIconSprite(),
    'icon-blade-radius': getBladeRadiusIconSprite(),
    'icon-halo-block': getHaloBladeIconSprite(),

    // Godhand
    'icon-laser-damage': getLaserDamageIconSprite(),
    'icon-laser-width': getLaserWidthIconSprite(),
    'icon-laser-efficiency': getLaserEfficiencyIconSprite(),
    'icon-laser-penetrate': getLaserPenetrateIconSprite(),
    'icon-laser-targeting': getLaserTargetingIconSprite(),
    'icon-laser-block': getLaserBlockIconSprite(),

    // Empty node placeholders
    'icon-empty-node-minor': createEmptyMinorNodeIcon(),
    'icon-empty-node-major': createEmptyMajorNodeIcon(),
  };
}

export function destroyShipSkillTreeSpriteCache(): void {
  iconCache = null;
}

/**
 * Resolves a cached skill tree icon sprite for a given `SkillNode.icon` string.
 * Returns fallback if unrecognized or if the cache is uninitialized.
 */
export function resolveSkillTreeIconSprite(icon: string): HTMLCanvasElement {
  if (!iconCache) {
    console.warn(`[SkillIconSpriteCache] Attempted to resolve icon before cache initialization: ${icon}`);
    return fallbackSprite;
  }
  const sprite = iconCache[icon];
  if (!sprite) {
    console.warn(`[SkillIconSpriteCache] Unrecognized icon key: ${icon}`);
    return fallbackSprite;
  }
  return sprite;
}
