// src/core/interfaces/events/HudReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function emitHudHideAll(): void {
  GlobalEventBus.emit('waves:hide', undefined);
  GlobalEventBus.emit('hud:hide', undefined);
  GlobalEventBus.emit('minimap:hide', undefined);
  GlobalEventBus.emit('blockqueue:hide', undefined);
  GlobalEventBus.emit('experiencebar:hide', undefined);
  GlobalEventBus.emit('firingmode:hide', undefined);
  GlobalEventBus.emit('meters:hide', undefined);
}

export function emitHudShowAll(): void {
  GlobalEventBus.emit('waves:show', undefined);
  GlobalEventBus.emit('hud:show', undefined);
  GlobalEventBus.emit('minimap:show', undefined);
  GlobalEventBus.emit('blockqueue:show', undefined);
  GlobalEventBus.emit('experiencebar:show', undefined);
  GlobalEventBus.emit('firingmode:show', undefined);
  GlobalEventBus.emit('meters:show', undefined);
}


export function emitFiringModeHide(): void {
  GlobalEventBus.emit('firingmode:hide', undefined);
}

export function emitFiringModeShow(): void {
  GlobalEventBus.emit('firingmode:show', undefined);
}

export function emitMetersHide(): void {
  GlobalEventBus.emit('meters:hide', undefined);
}

export function emitMetersShow(): void {
  GlobalEventBus.emit('meters:show', undefined);
}

export function emitBlockQueueHide(): void {
  GlobalEventBus.emit('blockqueue:hide', undefined);
}

export function emitBlockQueueShow(): void {
  GlobalEventBus.emit('blockqueue:show', undefined);
}

export function emitExperienceBarHide(): void {
  GlobalEventBus.emit('experiencebar:hide', undefined);
}

export function emitExperienceBarShow(): void {
  GlobalEventBus.emit('experiencebar:show', undefined);
}

// For waves, minimap, and hud, add show and hide functions
export function emitWavesHide(): void {
  GlobalEventBus.emit('waves:hide', undefined);
}

export function emitWavesShow(): void {
  GlobalEventBus.emit('waves:show', undefined);
}

export function emitMinimapHide(): void {
  GlobalEventBus.emit('minimap:hide', undefined);
}

export function emitMinimapShow(): void {
  GlobalEventBus.emit('minimap:show', undefined);
}

export function emitHudHide(): void {
  GlobalEventBus.emit('hud:hide', undefined);
}

export function emitHudShow(): void {
  GlobalEventBus.emit('hud:show', undefined);
}
