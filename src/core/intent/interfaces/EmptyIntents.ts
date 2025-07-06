// src/core/intent/interfaces/EmptyIntents.ts

import type { WeaponIntent } from './WeaponIntent';
import type { MovementIntent } from './MovementIntent';
import type { UtilityIntent } from './UtilityIntent';
import type { ShipIntent } from './ShipIntent';

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

export const EMPTY_WEAPON_INTENT: Readonly<WeaponIntent> = Object.freeze({
  firePrimary: false,
  fireSecondary: false,
  aimAt: null,
  firingMode: undefined,
});

export const EMPTY_UTILITY_INTENT: Readonly<UtilityIntent> = Object.freeze({
  toggleShields: false,
});

export const EMPTY_SHIP_INTENT: Readonly<ShipIntent> = Object.freeze({
  movement: EMPTY_MOVEMENT_INTENT,
  weapons: EMPTY_WEAPON_INTENT,
  utility: EMPTY_UTILITY_INTENT,
});
