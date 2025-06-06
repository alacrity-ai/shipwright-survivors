// src/config/view.ts
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

export function getViewportWidth(): number {
  return PlayerSettingsManager.getInstance().getViewportWidth();
}

export function getViewportHeight(): number {
  return PlayerSettingsManager.getInstance().getViewportHeight();
}
