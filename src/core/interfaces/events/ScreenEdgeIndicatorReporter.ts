// src/core/interfaces/events/ScreenEdgeIndicatorReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function createScreenEdgeIndicator(
  id: string,
  worldX: number,
  worldY: number,
  options?: { color?: string; icon?: HTMLImageElement | HTMLCanvasElement }
): void {
  GlobalEventBus.emit('indicator:create', { id, worldX, worldY, ...options });
}

export function removeScreenEdgeIndicator(id: string): void {
  GlobalEventBus.emit('indicator:remove', { id });
}

export function clearAllScreenEdgeIndicators(): void {
  GlobalEventBus.emit('indicator:clear', undefined);
}

export function enableScreenEdgeIndicators(): void {
  GlobalEventBus.emit('indicator:enable', undefined);
}

export function disableScreenEdgeIndicators(): void {
  GlobalEventBus.emit('indicator:disable', undefined);
}
