// src/core/interfaces/events/ScreenEdgeIndicatorReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function createScreenEdgeIndicator(
  id: string,
  worldX: number,
  worldY: number,
  options?: { color?: string; icon?: HTMLImageElement | HTMLCanvasElement }
): void {
  console.log('[ScreenEdgeIndicatorReporter] Creating indicator with id: ', id);
  GlobalEventBus.emit('indicator:create', { id, worldX, worldY, ...options });
}

export function removeScreenEdgeIndicator(id: string): void {
  console.log('[ScreenEdgeIndicatorReporter] Removing indicator with id: ', id);
  GlobalEventBus.emit('indicator:remove', { id });
}
