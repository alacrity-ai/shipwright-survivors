// src/game/interfaces/Projectile.ts

import type { Faction } from '@/game/interfaces/types/Faction';

export interface Projectile {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  type: string;
  damage: number;
  life: number; // in seconds
  ownerShipId: string;  // reference to the ship ID that fired the projectile
  ownerFaction: Faction;
  split: boolean;
  penetrate: boolean;
  hitShipIds: Set<string>; // Keeps track of ships hit by this projectile
}
