// src/systems/combat/types/WeaponTypes.ts

import type { GridCoord } from "@/game/interfaces/types/GridCoord";

/**
 * Represents a weapon-capable block tracked in a ship’s firing plan.
 * Uses BlockStore index rather than BlockInstance.
 */
export interface WeaponFiringPlanEntry {
  /** Index into BlockStore for the weapon block */
  blockIndex: number;

  /** Local grid coordinate of the block (for targeting/UI) */
  coord: GridCoord;

  /** Shots per second (default 1) */
  fireRate: number;

  /** Cooldown duration between shots (1 / fireRate by default) */
  fireCooldown: number;

  /** Accumulated time since last fired */
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
