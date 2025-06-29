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

/**
 * Emits a cursor:hide event to hide the cursor.
 */
export function hideCursor(): void {
  GlobalEventBus.emit('cursor:hide', undefined);
}

/**
 * Emits a cursor:show event to show the cursor.
 */
export function showCursor(): void {
  GlobalEventBus.emit('cursor:show', undefined);
}

/**
 * Emits a cursor:gamepad:hide event to hide the cursor when using a gamepad.
 */
export function hideGamepadCursor(): void {
  GlobalEventBus.emit('cursor:gamepad:hide', undefined);
}

/**
 * Emits a cursor:gamepad:show event to show the cursor when using a gamepad.
 */
export function showGamepadCursor(): void {
  GlobalEventBus.emit('cursor:gamepad:show', undefined);
}
