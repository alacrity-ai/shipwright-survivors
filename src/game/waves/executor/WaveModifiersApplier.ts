// src/game/waves/executor/WaveModifiersApplier.ts

import type { Ship } from '@/game/ship/Ship';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

const modAffixMap: Record<string, ShipAffixes> = {
  'extra-aggressive': {
    fireRateMulti: 1.5,
    thrustPowerMulti: 1.2,
    turnPowerMulti: 1.2,
    rammingDamageInflictMultiplier: 1.3,
  },
  'shielded': {
    shieldEfficiencyMulti: 1.4,
    shieldRadiusMulti: 1.25,
    shieldEnergyDrainMulti: 0.75,
  },
  'fast': {
    thrustPowerMulti: 1.6,
    turnPowerMulti: 1.6,
  },
};

export class WaveModifiersApplier {
  public apply(ship: Ship, mods: string[]): void {
    if (!mods.length) return;

    const mergedAffixes: ShipAffixes = { ...ship.getAffixes() };

    for (const mod of mods) {
      const affix = modAffixMap[mod];
      if (!affix) continue;

      for (const key of Object.keys(affix) as (keyof ShipAffixes)[]) {
        const val = affix[key];

        if (typeof val === 'number') {
          const existing = mergedAffixes[key];
          (mergedAffixes as any)[key] = (typeof existing === 'number' ? existing : 1) * val;
        } else if (typeof val === 'boolean') {
          (mergedAffixes as any)[key] = val;
        }
      }
    }

    ship.setAffixes(mergedAffixes);
  }
}
