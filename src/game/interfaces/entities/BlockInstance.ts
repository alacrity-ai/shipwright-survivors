// src/game/interfaces/BlockInstance.ts

import type { BlockType } from '@/game/interfaces/types/BlockType';

import { Faction } from '@/game/interfaces/types/Faction';

export interface BlockInstance {
  id: string;             // UUID
  type: BlockType;       // reference to immutable block definition
  hp: number;            // current health
  ownerShipId: string;   // unique ID of the ship this block belongs to
  ownerFaction: Faction;
  indestructible?: boolean; // if true, block cannot be destroyed
  cooldown?: number;     // used for turret/engine action delay
  rotation?: number;     // degrees: 0, 90, 180, 270
  position?: { x: number; y: number };  // relative position of the block within the ship
  isShielded?: boolean;  // is this block currently under the effects of a shield?
  shieldEfficiency?: number; // efficiency of the shield protecting this block
  shieldHighlightColor?: string;
  shieldSourceId?: string;
  hidden?: boolean; // JUST ADDED THIS <----
}
