// src/systems/combat/types/WeaponTypes.ts

import type { BlockInstance } from "@/game/interfaces/entities/BlockInstance";
import type { GridCoord } from "@/game/interfaces/types/GridCoord";

export interface WeaponFiringPlanEntry {
  coord: GridCoord;
  block: BlockInstance;
  fireRate: number;
  fireCooldown: number;
  timeSinceLastShot: number;
}

export enum FiringMode {
  Synced = 'synced',
  Sequence = 'sequence',
}

export type TurretClassId = string;

export interface TurretSequenceState {
  nextIndex: number;
  lastFiredAt: number;
}
