// src/config/view.ts
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

export function getViewportWidth(): number {
  return PlayerSettingsManager.getInstance().getViewportWidth();
}

export function getViewportHeight(): number {
  return PlayerSettingsManager.getInstance().getViewportHeight();
}

export function getResolutionScaleFactor(): number {
  const w = getViewportWidth();
  const h = getViewportHeight();
  if (w >= 3840) return 1.8;
  if (w >= 2560) return 1.2;
  if (h >= 1200) return 1.0;
  return 0.8;
}
