// src/game/interfaces/BlockBehavior.ts

import type { FireBehavior } from '@/game/interfaces/behavior/FireBehavior';

export interface BlockBehavior {
  canFire?: boolean;
  fire?: FireBehavior;
  canThrust?: boolean;
  thrustPower?: number;
  energyChargeRate?: number; // Added
  turnPower?: number;
  isCockpit?: boolean;
  energyMaxIncrease?: number; // Added\
  shieldEfficiency?: number;
  shieldRadius?: number;
}
