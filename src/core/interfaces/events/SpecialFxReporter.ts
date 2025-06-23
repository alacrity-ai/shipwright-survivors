// src/core/interfaces/events/SpecialFxReporter.ts

import { GlobalEventBus } from '@/core/EventBus';
import type { SpecialFxInstance } from '@/rendering/unified/interfaces/SpecialFxInstance';

/**
 * Emits an event to create a new special FX instance at runtime.
 */
export function spawnSpecialFx(fx: Omit<SpecialFxInstance, 'time'>): void {
  GlobalEventBus.emit('fx:spawn', fx);
}

/**
 * Clears all active special FX immediately.
 */
export function clearAllSpecialFx(): void {
  GlobalEventBus.emit('fx:clear', undefined);
}

/* Example usage:
spawnSpecialFx({
  worldX: playerX,
  worldY: playerY,
  radius: 3.5,
  strength: 1.0,
  duration: 1.2,
  type: 0, // e.g. shockwave
});
*/