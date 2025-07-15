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
  GlobalEventBus.emit('attachAllButton:hide', undefined);
  GlobalEventBus.emit('rollButton:hide', undefined);
  GlobalEventBus.emit('attachButton:hide', undefined);
  GlobalEventBus.emit('combineButton:hide', undefined);
  GlobalEventBus.emit('activeContractsButton:hide', undefined);
  GlobalEventBus.emit('jumpCastButton:hide', undefined);
}

export function emitHudShowAll(): void {
  GlobalEventBus.emit('waves:show', undefined);
  GlobalEventBus.emit('hud:show', undefined);
  GlobalEventBus.emit('minimap:show', undefined);
  GlobalEventBus.emit('blockqueue:show', undefined);
  GlobalEventBus.emit('experiencebar:show', undefined);
  GlobalEventBus.emit('firingmode:show', undefined);
  GlobalEventBus.emit('meters:show', undefined);
  GlobalEventBus.emit('attachAllButton:show', undefined);
  GlobalEventBus.emit('rollButton:show', undefined);
  GlobalEventBus.emit('attachButton:show', undefined);
  GlobalEventBus.emit('combineButton:show', undefined);
  GlobalEventBus.emit('activeContractsButton:show', undefined);
  GlobalEventBus.emit('jumpCastButton:show', undefined);
}


export function emitActiveContractsButtonShow(): void {
  GlobalEventBus.emit('activeContractsButton:show', undefined);
}

export function emitActiveContractsButtonHide(): void {
  GlobalEventBus.emit('activeContractsButton:hide', undefined);
}

export function emitJumpCastButtonShow(): void {
  GlobalEventBus.emit('jumpCastButton:show', undefined);
}

export function emitJumpCastButtonHide(): void {
  GlobalEventBus.emit('jumpCastButton:hide', undefined);
}

export function emitAttachButtonShow(): void {
  GlobalEventBus.emit('attachButton:show', undefined);
}

export function emitAttachButtonHide(): void {
  GlobalEventBus.emit('attachButton:hide', undefined);
}

export function emitAttachAllButtonShow(): void {
  GlobalEventBus.emit('attachAllButton:show', undefined);
}

export function emitAttachAllButtonHide(): void {
  GlobalEventBus.emit('attachAllButton:hide', undefined);
}

export function emitCombineButtonShow(): void {
  GlobalEventBus.emit('combineButton:show', undefined);
}

export function emitCombineButtonHide(): void {
  GlobalEventBus.emit('combineButton:hide', undefined);
}

export function emitRollButtonShow(): void {
  GlobalEventBus.emit('rollButton:show', undefined);
}

export function emitRollButtonHide(): void {
  GlobalEventBus.emit('rollButton:hide', undefined);
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
