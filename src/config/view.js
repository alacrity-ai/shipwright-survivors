// src/config/view.ts
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
export function getViewportWidth() {
    return PlayerSettingsManager.getInstance().getViewportWidth();
}
export function getViewportHeight() {
    return PlayerSettingsManager.getInstance().getViewportHeight();
}
