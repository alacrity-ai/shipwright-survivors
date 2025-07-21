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

/** Low-level emitter for fully custom fire payloads. */
export function emitFire(params: {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  radius?: number;
  life?: number;
  intensity?: number;
  rampIndex?: number;
  randomizeRadius?: boolean;
  randomizeLife?: boolean;
  count?: number;
  light?: boolean;
  lightRadiusScalar?: number;
  lightIntensity?: number;
  color?: string;
}): void {
  GlobalEventBus.emit('fx:fire:emit', params);
}

// === Prefab Emitters ===

export function emitDefaultFlames(x: number, y: number, radius = 250, life = 1.0, light = true, count = 5, color = '#ff9933', vx: number = 0, vy: number = 0): void {
  emitFire({
    x,
    y,
    vx,
    vy,
    radius,
    life,
    intensity: 0.25,
    rampIndex: 0, // classic orange flame
    randomizeRadius: true,
    randomizeLife: true,
    count,
    light,
    lightRadiusScalar: 4.0,
    lightIntensity: 0.4,
    color,
  });
}

export function emitBlueFlames(x: number, y: number, count = 5): void {
  emitFire({
    x,
    y,
    radius: 20,
    life: 1.2,
    intensity: 0.8,
    rampIndex: 2, // plasma/blue flame
    randomizeRadius: true,
    randomizeLife: true,
    count,
    light: true,
    lightRadiusScalar: 4.5,
    lightIntensity: 1.0,
    color: '#33ccff',
  });
}

export function emitPoisonFlames(x: number, y: number, count = 4): void {
  emitFire({
    x,
    y,
    radius: 22,
    life: 1.4,
    intensity: 1.0,
    rampIndex: 1, // acid/poison flame
    randomizeRadius: true,
    randomizeLife: true,
    count,
    light: true,
    lightRadiusScalar: 4.0,
    lightIntensity: 1.0,
    color: '#33ff99',
  });
}

export function emitBigExplosionFlames(x: number, y: number, count = 12): void {
  emitFire({
    x,
    y,
    radius: 48,
    life: 1.5,
    intensity: 1.5,
    rampIndex: 0, // fiery explosion
    randomizeRadius: true,
    randomizeLife: true,
    count,
    light: true,
    lightRadiusScalar: 6.0,
    lightIntensity: 2.0,
    color: '#ff6600',
  });
}
