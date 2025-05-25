// src/game/interfaces/entities/PickupInstance.ts

import type { PickupType } from '@/game/interfaces/types/PickupType';

// Define the spark interface
export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
}

export interface PickupInstance {
  type: PickupType;        // Reference to the PickupType
  position: { x: number; y: number }; // The position of the pickup in the game world
  isPickedUp: boolean;     // Whether the pickup has been collected by the player
  currencyAmount: number;  // The amount of currency this pickup provides (specific to currency pickups)
  ttl?: number;            // Optional "time-to-live" for future expansion

  rotation: number;        // Track the rotation of the pickup for spinning effect
  sparks: Spark[];         // Array of sparks emitted from the pickup
}
