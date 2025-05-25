// src/game/interfaces/types/PickupType.ts

export type PickupCategory = 'currency';  // Since we're only using currency pickups for now

export interface PickupType {
  id: string;            // Unique ID for the pickup type
  name: string;          // Name of the pickup (e.g., "Gold Coin")
  sprite: string;        // Sprite or image representing the pickup
  currencyAmount: number; // The amount of currency this pickup provides
  category: PickupCategory; // This will be 'currency' for now
}
