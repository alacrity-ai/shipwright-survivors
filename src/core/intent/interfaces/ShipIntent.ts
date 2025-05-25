// src/core/interfaces/intent/ShipIntent.ts

import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';

export interface ShipIntent {
  movement: MovementIntent;
  weapons: WeaponIntent;
}
