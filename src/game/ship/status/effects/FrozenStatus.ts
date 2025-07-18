// src/game/ship/status/effects/FrozenStatus.ts

import { StatusEffect } from '@/game/ship/status/StatusEffect';

import type { Ship } from '@/game/ship/Ship';

export class FrozenStatus extends StatusEffect {
  update(dt: number, ship: Ship): void {
    this.tickDuration(dt);
    // ship.movementModifier = 0; // fully stops movement
  }

  onExpire(ship: Ship): void {
    // ship.movementModifier = 1;
  }
}
