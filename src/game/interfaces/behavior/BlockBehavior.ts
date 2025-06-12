// src/game/interfaces/BlockBehavior.ts

import type { FireBehavior } from '@/game/interfaces/behavior/FireBehavior';
import type { HaloBladeProperties } from '@/game/interfaces/behavior/HaloBladeProperties';

export interface BlockBehavior {
  canFire?: boolean;
  fire?: FireBehavior;
  canThrust?: boolean;
  thrustPower?: number;
  energyChargeRate?: number;
  turnPower?: number;
  isCockpit?: boolean;
  energyMaxIncrease?: number;
  shieldEfficiency?: number;
  shieldRadius?: number;
  shieldEnergyDrain?: number;
  harvestRate?: number;
  rammingDamageMultiplier?: number; // NEW
  rammingArmor?: number; // NEW
  haloBladeProperties?: HaloBladeProperties;
}
