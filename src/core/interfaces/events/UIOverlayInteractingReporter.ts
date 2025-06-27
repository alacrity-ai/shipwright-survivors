// src/core/interfaces/events/UIOverlayInteractingReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function reportOverlayInteracting(): void {
  GlobalEventBus.emit('ui:overlay:interacting', undefined);
}

export function reportOverlayNotInteracting(): void {
  GlobalEventBus.emit('ui:overlay:not-interacting', undefined);
}
