// src/core/interfaces/intent/WeaponIntent.ts

export interface WeaponIntent {
  firePrimary: boolean;
  fireSecondary: boolean;
  aimAt: { x: number; y: number } | null;
}
