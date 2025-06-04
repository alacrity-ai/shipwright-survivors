// src/systems/utility/UtilitySystem.ts

import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { UtilityIntent } from '@/core/intent/interfaces/UtilityIntent';

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

  public update(dt: number, ship: Ship, transform: BlockEntityTransform): void {
    for (const backend of this.backends) {
      backend.update(dt, ship, transform, this.currentIntent);
    }
  }
}
