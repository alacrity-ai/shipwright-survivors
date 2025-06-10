// src/game/interfaces/types/PickupType.ts

export type PickupCategory = 'currency' | 'blockUnlock' | 'repair';

export interface PickupType {
  id: string;               // Unique ID for the pickup type
  name: string;             // Name of the pickup (e.g., "Gold Coin")
  sprite: string;           // Sprite key in cache
  currencyAmount: number;   // Currency provided (0 for non-currency pickups)
  category: PickupCategory; // Determines pickup logic
  blockTypeId?: string;     // Present if category is 'blockUnlock'
  repairAmount?: number;    // Present if category is 'repair'
}
