// src/game/interfaces/entities/PickupInstance.ts

import type { PickupType } from '@/game/interfaces/types/PickupType';

export interface PickupInstance {
  type: PickupType;
  position: { x: number; y: number };
  isPickedUp: boolean;
  currencyAmount: number;
  ttl?: number;
  rotation: number;
}

// Optional: Keep this here if other systems will use it directly
export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
  speed: number;
}
