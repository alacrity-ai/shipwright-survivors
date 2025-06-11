// src/core/interfaces/intent/WeaponIntent.ts

import { FiringMode } from '@/systems/combat/types/WeaponTypes';

export interface WeaponIntent {
  firePrimary: boolean;
  fireSecondary: boolean;
  aimAt: { x: number; y: number } | null;
  firingMode?: FiringMode;
}
