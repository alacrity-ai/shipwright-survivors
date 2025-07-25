// src/game/ship/systems/EnergyRechargeSystem.ts

import type { IUpdatable } from '@/core/interfaces/types';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';

import type { BlockStore } from '@/game/blocks/system/BlockStore';
import { BlockManager } from '@/game/blocks/system/BlockManager';

import { getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';

export class EnergyRechargeSystem implements IUpdatable {
  private store: BlockStore;

  constructor(private readonly shipRegistry: ShipRegistry) {
    this.store = BlockManager.getInstance().getBlockStore();
  }

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

        for (const idx of ship.getShieldBlockIndices()) {
          const typeIdx = this.store.typeIndex[idx];
          const blockType = getBlockTypeByIndex(typeIdx);
          if (!blockType) continue;

          const baseDrain = blockType.behavior?.shieldEnergyDrain ?? 0;
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
