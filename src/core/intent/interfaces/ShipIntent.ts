// src/core/interfaces/intent/ShipIntent.ts

import type { FiringMode } from '@/systems/combat/types/WeaponTypes';

/**
 * Old object-based interface, for backwards compatibility.
 * We'll phase this out once all systems use IntentSOA.
 */
export interface ShipIntent {
  movement: MovementIntent;
  weapons: WeaponIntent;
  utility: UtilityIntent;
}

export interface MovementIntent {
  thrustForward: boolean;
  brake: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  turnToAngle?: number; // radians, 0 is "up"
  afterburner?: boolean;
}

export interface WeaponIntent {
  firePrimary: boolean;
  fireSecondary: boolean;
  aimAt: { x: number; y: number } | null;
  firingMode?: FiringMode;
}

export interface UtilityIntent {
  toggleShields: boolean;
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

export const EMPTY_MOVEMENT_INTENT: Readonly<MovementIntent> = Object.freeze(
  EMPTY_SHIP_INTENT.movement
);
export const EMPTY_WEAPON_INTENT: Readonly<WeaponIntent> = Object.freeze(
  EMPTY_SHIP_INTENT.weapons
);
export const EMPTY_UTILITY_INTENT: Readonly<UtilityIntent> = Object.freeze(
  EMPTY_SHIP_INTENT.utility
);

export interface IntentSOA {
  count: number;
  thrustForward: Uint8Array;
  brake: Uint8Array;
  rotateLeft: Uint8Array;
  rotateRight: Uint8Array;
  strafeLeft: Uint8Array;
  strafeRight: Uint8Array;
  turnToAngle: Float32Array;
  afterburner: Uint8Array;
  firePrimary: Uint8Array;
  fireSecondary: Uint8Array;
  aimX: Float32Array;
  aimY: Float32Array;
  firingMode: Int8Array;
  toggleShields: Uint8Array;

  // New field for AI relevance/culling
  culledFlags: Uint8Array;  // 0 = active, 1 = culled
}

export function createIntentSOA(maxShips: number): IntentSOA {
  return {
    count: 0,
    thrustForward: new Uint8Array(maxShips),
    brake: new Uint8Array(maxShips),
    rotateLeft: new Uint8Array(maxShips),
    rotateRight: new Uint8Array(maxShips),
    strafeLeft: new Uint8Array(maxShips),
    strafeRight: new Uint8Array(maxShips),
    turnToAngle: new Float32Array(maxShips),
    afterburner: new Uint8Array(maxShips),
    firePrimary: new Uint8Array(maxShips),
    fireSecondary: new Uint8Array(maxShips),
    aimX: new Float32Array(maxShips),
    aimY: new Float32Array(maxShips),
    firingMode: new Int8Array(maxShips),
    toggleShields: new Uint8Array(maxShips),

    culledFlags: new Uint8Array(maxShips),
  };
}