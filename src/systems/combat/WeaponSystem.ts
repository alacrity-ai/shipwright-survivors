// src/systems/combat/WeaponSystem.ts

import type { Ship } from '@/game/ship/Ship';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { IntentSOA } from '@/core/intent/interfaces/ShipIntent';

// Define the interface for pluggable weapon backends
export interface WeaponBackend {
  update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void;
  render(dt: number): void;
  destroy?(): void;
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

  /**
   * SOA-based intent setter.
   * Pulls primary/secondary fire flags and aim vector from the shared SOA buffers.
   */
  public setSOAIntent(soa: IntentSOA, idx: number): void {
    this.currentIntent = {
      firePrimary: !!soa.firePrimary[idx],
      fireSecondary: !!soa.fireSecondary[idx],
      aimAt: { x: soa.aimX[idx] || 0, y: soa.aimY[idx] || 0 },
    };
  }

  public update(dt: number, ship: Ship, transform: BlockEntityTransform): void {
    for (const backend of this.backends) {
      backend.update(dt, ship, transform, this.currentIntent);
    }
  }

  public render(dt: number): void {
    for (const backend of this.backends) {
      if (backend.render) {
        backend.render(dt);
      }
    }
  }

  public destroy(): void {
    for (const backend of this.backends) {
      if (backend.destroy) {
        backend.destroy();
      }
    }
  }
}
