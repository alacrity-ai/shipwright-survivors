// src/game/ship/systems/EnergyRechargeSystem.ts

import type { IUpdatable } from '@/core/interfaces/types';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';

export class EnergyRechargeSystem implements IUpdatable {
  constructor(private readonly shipRegistry: ShipRegistry) {}

  update(dt: number): void {
    for (const ship of this.shipRegistry.getAll()) {
      const energy = ship.getEnergyComponent();
      const shield = ship.getShieldComponent();

      if (!energy) continue;

      // === Apply passive recharge
      energy.update(dt);

      // === Apply shield drain if shields are active
      if (shield.isActive()) {
        let totalDrain = 0;

        for (const block of ship.getShieldBlocks()) {
          const baseDrain = block.type.behavior?.shieldEnergyDrain ?? 0;
          totalDrain += baseDrain;
        }

        // === Apply passive multiplier (e.g., 0.9 for -10%)
        const drainMultiplier = ship.getPassiveBonus('shield-energy-drain'); // default 1.0
        const drainAmount = totalDrain * drainMultiplier * dt;

        const success = energy.spend(drainAmount);

        // === Deactivate shields if energy is too low
        if (!success) {
          shield.deactivate();
        }
      }
    }
  }
}
