// src/game/ship/systems/EnergyRechargeSystem.ts

import type { IUpdatable } from '@/core/interfaces/types';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';

export class EnergyRechargeSystem implements IUpdatable {
  constructor(private readonly shipRegistry: ShipRegistry) {}

  update(dt: number): void {
    for (const ship of this.shipRegistry.getAll()) {
      ship.getEnergyComponent()?.update(dt);
    }
  }
}
