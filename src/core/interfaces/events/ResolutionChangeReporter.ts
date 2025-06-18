// src/core/events/ResolutionChangeReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

/**
 * Emits a global event when the screen resolution changes.
 * Should be called by the canvas manager or window resize listener.
 */
export function reportResolutionChange(width: number, height: number): void {
  GlobalEventBus.emit('resolution:changed', { width, height });
}
