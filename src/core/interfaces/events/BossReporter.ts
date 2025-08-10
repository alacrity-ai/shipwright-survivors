// src/core/interfaces/events/BossReporter.ts

import { GlobalEventBus } from '@/core/EventBus';
import type { BossArenaOptions } from '@/rendering/unified/controllers/BossArenaRenderingController';

/**
 * Spawns (or resets) the boss arena with the given parameters.
 * Fires a 'bossArena:spawn' event to be handled by BossArenaController.
 */
export function spawnBossArena(opts: BossArenaOptions): void {
  GlobalEventBus.emit('bossArena:spawn', opts);
}

export function clearBossArena(): void {
  GlobalEventBus.emit('bossArena:clear', undefined);
}

/**
 * Spawns a default boss arena at the given center with a specified radius.
 * Defaults to forming state (state 1) with a standard forming duration.
 */
export function spawnDefaultBossArena(
  center: [number, number],
  radius: number,
  formingDuration: number = 3.0
): void {
  spawnBossArena({
    center,
    radius,
    initialState: 1, // Start forming
    formingDuration
  });
}


// Show Boss healthbars
export function showBossHealthbar(): void {
  GlobalEventBus.emit('bosshealthbar:show', undefined);
}

export function hideBossHealthbar(): void {
  GlobalEventBus.emit('bosshealthbar:hide', undefined);
}
