// src/core/interfaces/events/CursorReporter.ts

import { GlobalEventBus } from '@/core/EventBus';
import type { CursorChangeType } from '@/core/interfaces/EventTypes';

/**
 * Emits a cursor:change event to update the active cursor sprite.
 * @param type The cursor variant to display (e.g., 'crosshair', 'target', etc.)
 */
export function setCursor(type: CursorChangeType): void {
  GlobalEventBus.emit('cursor:change', { type });
}

/**
 * Emits a cursor:restore event to revert the cursor to its default state.
 */
export function restoreCursor(): void {
  GlobalEventBus.emit('cursor:restore', undefined);
}
