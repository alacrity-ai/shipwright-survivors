// src/game/ship/status/StatusEffect.ts

import type { Ship } from '@/game/ship/Ship';
import type { StatusEffectType } from '@/game/ship/interfaces/ShipStatusEffects';

export abstract class StatusEffect {
  constructor(
    public readonly type: StatusEffectType,
    protected duration: number,
    protected sourceShip: Ship | null,
    protected intensity: number = 1,
  ) {}

  public abstract update(dt: number, ship: Ship): void;

  public onApply?(ship: Ship): void;
  public onExpire?(ship: Ship): void;

  public isExpired(): boolean {
    return this.duration <= 0;
  }

  public getRemainingDuration(): number {
    return this.duration;
  }

  protected tickDuration(dt: number): void {
    this.duration -= dt;
  }
}
