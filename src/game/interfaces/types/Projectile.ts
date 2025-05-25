// src/game/interfaces/Projectile.ts

export interface Projectile {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  type: string;
  damage: number;
  life: number; // in seconds
  ownerShipId: string;  // reference to the ship ID that fired the projectile
}
