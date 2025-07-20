// src/systems/utility/UtilitySystem.ts

import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { UtilityIntent } from '@/core/intent/interfaces/UtilityIntent';
import type { IntentSOA } from '@/core/intent/interfaces/ShipIntent';

export interface UtilityBackend {
  update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: UtilityIntent | null): void;
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

  /**
   * SOA-based intent setter.
   * Reads `toggleShields` (and any future utility bits) from the SOA buffers.
   */
  public setSOAIntent(soa: IntentSOA, idx: number): void {
    this.currentIntent = {
      toggleShields: !!soa.toggleShields[idx],
    };
  }

  public update(dt: number, ship: Ship, transform: BlockEntityTransform): void {
    for (const backend of this.backends) {
      backend.update(dt, ship, transform, this.currentIntent);
    }
  }
}
