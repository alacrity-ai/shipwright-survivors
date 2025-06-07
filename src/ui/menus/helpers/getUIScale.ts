// src/ui/menus/helpers/getUIScale.ts

import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { getViewportWidth, getViewportHeight } from '@/config/view';

export function getUIScale(): number {
  return PlayerSettingsManager.getInstance().getInterfaceScale() || 2.0;
}

export function getUITextScale(scale: number): number {
  const w = getViewportWidth();

  // Base at 1920px (1080p), clamp between [0.75, 1.25]
  // Scale factor: 1920 → 0.75, 2560 → 1.0, 3840 → 1.25
  const baseWidth = 1920;
  const minFactor = 0.75;
  const maxFactor = 1.25;

  // Linear interpolation
  const factor = minFactor + (Math.min(w, 3840) - baseWidth) * (maxFactor - minFactor) / (3840 - baseWidth);

  return scale * factor;
}
