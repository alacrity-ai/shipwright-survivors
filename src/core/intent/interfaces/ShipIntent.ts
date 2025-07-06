// src/core/interfaces/intent/ShipIntent.ts

import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { UtilityIntent } from '@/core/intent/interfaces/UtilityIntent';

export interface ShipIntent {
  movement: MovementIntent;
  weapons: WeaponIntent;
  utility: UtilityIntent;
}

export const EMPTY_SHIP_INTENT: Readonly<ShipIntent> = Object.freeze({
  movement: {
    thrustForward: false,
    brake: false,
    rotateLeft: false,
    rotateRight: false,
    strafeLeft: false,
    strafeRight: false,
    turnToAngle: undefined,
    afterburner: false,
  },
  weapons: {
    firePrimary: false,
    fireSecondary: false,
    aimAt: null,
    firingMode: undefined,
  },
  utility: {
    toggleShields: false,
  },
});


export const EMPTY_WEAPON_INTENT: Readonly<WeaponIntent> = Object.freeze({
  firePrimary: false,
  fireSecondary: false,
  aimAt: null,
  firingMode: undefined,
});

export const EMPTY_MOVEMENT_INTENT: Readonly<MovementIntent> = Object.freeze({
  thrustForward: false,
  brake: false,
  rotateLeft: false,
  rotateRight: false,
  strafeLeft: false,
  strafeRight: false,
  turnToAngle: undefined,
  afterburner: false,
});

export const EMPTY_UTILITY_INTENT: Readonly<UtilityIntent> = Object.freeze({
  toggleShields: false,
});
