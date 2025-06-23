// src/core/interfaces/events/OverlayReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function emitHudHide(): void {
  GlobalEventBus.emit('hud:hide', undefined);
}

export function emitHudShow(): void {
  GlobalEventBus.emit('hud:show', undefined);
}

export function emitMinimapHide(): void {
  GlobalEventBus.emit('minimap:hide', undefined);
}

export function emitMinimapShow(): void {
  GlobalEventBus.emit('minimap:show', undefined);
}

export function emitWavesHide(): void {
  GlobalEventBus.emit('waves:hide', undefined);
}

export function emitWavesShow(): void {
  GlobalEventBus.emit('waves:show', undefined);
}
