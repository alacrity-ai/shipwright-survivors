// src/systems/utility/UtilitySystem.ts

import type { Ship } from '@/game/ship/Ship';
import type { ShipTransform } from '@/systems/physics/MovementSystem';
import type { UtilityIntent } from '@/core/intent/interfaces/UtilityIntent';

export interface UtilityBackend {
  update(dt: number, ship: Ship, transform: ShipTransform, intent: UtilityIntent | null): void;
}

export class UtilitySystem {
  private currentIntent: UtilityIntent | null = null;
  private readonly backends: UtilityBackend[];

  constructor(...backends: UtilityBackend[]) {
    this.backends = backends;
  }

  public setIntent(intent: UtilityIntent): void {
    this.currentIntent = intent;
  }

  public update(dt: number, ship: Ship, transform: ShipTransform): void {
    for (const backend of this.backends) {
      backend.update(dt, ship, transform, this.currentIntent);
    }
  }
}
