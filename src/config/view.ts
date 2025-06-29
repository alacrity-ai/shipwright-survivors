// src/config/view.ts
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from './virtualResolution';

export const BLOCK_SIZE = 32;
export const PIXELS_PER_WORLD_UNIT = BLOCK_SIZE / 16;

export function getViewportWidth(): number {
  return PlayerSettingsManager.getInstance().getViewportWidth();
}

export function getViewportHeight(): number {
  return PlayerSettingsManager.getInstance().getViewportHeight();
}

export function getWidthScaleFactor(): number {
  return getViewportWidth() / VIRTUAL_WIDTH;
}

export function getHeightScaleFactor(): number {
  return getViewportHeight() / VIRTUAL_HEIGHT;
}

export function getUniformScaleFactor(): number {
  return Math.min(getWidthScaleFactor(), getHeightScaleFactor());
}

export function getResolutionScaleFactor(): number {
  const w = getViewportWidth();
  const h = getViewportHeight();
  console.log('[getResolutionScaleFactor] w:', w, ' h:', h);
  if (w >= 3840) return 1.8;
  if (w >= 2560) return 1.2;
  if (h >= 1200) return 1.0;
  return 0.8;
}
