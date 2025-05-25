// src/core/intent/defaultIntent.ts

import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

export function createDefaultIntent(): ShipIntent {
  return {
    movement: {
      thrustForward: false,
      brake: false,
      rotateLeft: false,
      rotateRight: false,
    },
    weapons: {
      firePrimary: false,
      fireSecondary: false,
      aimAt: null,
    },
  };
}
