// src/systems/combat/WeaponSystem.ts

import type { Ship } from '@/game/ship/Ship';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { ShipTransform } from '@/systems/physics/MovementSystem';

// Define the interface for pluggable weapon backends
export interface WeaponBackend {
  update(dt: number, ship: Ship, transform: ShipTransform, intent: WeaponIntent | null): void;
}

export class WeaponSystem {
  private currentIntent: WeaponIntent | null = null;
  private readonly backends: WeaponBackend[];

  constructor(...backends: WeaponBackend[]) {
    this.backends = backends;
  }

  public setIntent(intent: WeaponIntent): void {
    this.currentIntent = intent;
  }

  public update(dt: number, ship: Ship, transform: ShipTransform): void {
    for (const backend of this.backends) {
      backend.update(dt, ship, transform, this.currentIntent);
    }
  }
}
