// src/game/interfaces/BlockBehavior.ts

import type { FireBehavior } from '@/game/interfaces/behavior/FireBehavior';

export interface BlockBehavior {
  canFire?: boolean;
  fire?: FireBehavior;

  canThrust?: boolean;
  thrustPower?: number;

  turnPower?: number;
  isCockpit?: boolean;
}
