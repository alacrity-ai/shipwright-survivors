// src/core/interfaces/events/SpecialFxReporter.ts

import { GlobalEventBus } from '@/core/EventBus';
import type { SpecialFxInstance } from '@/rendering/unified/interfaces/SpecialFxInstance';
import type { LightningBoltSpawnEvent } from '@/core/interfaces/EventTypes';  // ← import the new payload

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

/**
 * Emit a request for the LightningSystem (or any interested listener)
 * to materialise a jagged or laser-style bolt at runtime.
 *
 * Usage example:
 * ```ts
 * spawnLightningBolt({
 *   start: { x: 0, y: 0 },
 *   end:   { x: 800, y: 250 },
 *   opts: {
 *     lifetime: 0.4,
 *     thickness: 4,
 *     color: [0.25, 0.9, 1.0, 1],
 *     subdivision: 5,
 *     jitter: 0.15,
 *     lightRadius: 1000,
 *     lightIntensity: 1.5,
 *   },
 * });
 * ```
 */
export function spawnLightningBolt(
  payload: LightningBoltSpawnEvent
): void {
  GlobalEventBus.emit('lightning:bolt:spawn', payload);
}
