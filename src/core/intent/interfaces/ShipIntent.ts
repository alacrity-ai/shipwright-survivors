// src/core/interfaces/intent/ShipIntent.ts

import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { UtilityIntent } from '@/core/intent/interfaces/UtilityIntent';

export interface ShipIntent {
  movement: MovementIntent;
  weapons: WeaponIntent;
  utility: UtilityIntent;
}
