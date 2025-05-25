// src/game/interfaces/BlockInstance.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';

export interface BlockInstance {
  type: BlockType;       // reference to immutable block definition
  hp: number;            // current health
  ownerShipId: string;   // unique ID of the ship this block belongs to
  cooldown?: number;     // used for turret/engine action delay
  rotation?: number;     // degrees: 0, 90, 180, 270
  position?: { x: number; y: number };  // relative position of the block within the ship
}
