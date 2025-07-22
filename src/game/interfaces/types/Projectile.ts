// src/game/interfaces/Projectile.ts

import type { Faction } from '@/game/interfaces/types/Faction';

export interface Projectile {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  type: number;
  damage: number;
  life: number; // in seconds
  ownerShipId: number;  // reference to the ship ID that fired the projectile
  ownerFaction: number; // 0=Player, 1=Enemy, 2=Neutral
  split: boolean;
  penetrate: boolean;
  hitShipIds: Set<string>; // Keeps track of ships hit by this projectile
}
