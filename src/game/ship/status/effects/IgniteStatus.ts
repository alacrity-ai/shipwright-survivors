// src/game/ship/status/effects/IgniteStatus.ts

import { StatusEffect } from '@/game/ship/status/StatusEffect';
import { reportDamageOverTime } from '@/core/interfaces/events/StatusEffectReporter';
import { emitDefaultFlames } from '@/core/interfaces/events/SpecialFxReporter';

import type { Ship } from '@/game/ship/Ship';

export class IgniteStatus extends StatusEffect {
  private fxTimer = 0;        // For flame visuals and damage ticks (every ~10 frames)

  // Precompute to avoid magic numbers; assuming 120fps, 10 frames ≈ 0.08 seconds
  private static readonly FX_INTERVAL = 10 / 120;

  update(dt: number, ship: Ship): void {
    if (ship.isDestroyed()) return;
    this.tickDuration(dt);

    // Visual flame emission and minor damage (~5 frames)
    this.fxTimer += dt;
    if (this.fxTimer >= IgniteStatus.FX_INTERVAL) {
      this.fxTimer -= IgniteStatus.FX_INTERVAL;
      this.emitFlameEffect(ship);
      reportDamageOverTime(ship, this.sourceShip, this.intensity || 1, 'dot');
    }
  }

  onExpire(ship: Ship): void {
    // NOOP
  }

  private emitFlameEffect(ship: Ship): void {
    const { x: blockX, y: blockY } = ship.getRandomBlockWorldPosition();
    const radiusMulti = Math.random() * 0.5 + 0.75;
    emitDefaultFlames(blockX, blockY, 120 * radiusMulti, 0.7, true, 1, '#ff6600');
  }
}
