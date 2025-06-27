// src/game/powerups/types/PowerupMetadataTypes.ts

export interface PowerupEffectMetadata {
  // Offense
  critChance?: number; // Implemented
  critMultiplier?: number; // Implemented
  lifeStealOnCrit?: boolean; // Implemented
  critLifeStealPercent?: number; // Implemented
  baseDamageMultiplier?: number; // Implemented
  fireRateMultiplier?: number; // Implemented

  // Defense
  flatDamageReductionPercent?: number; // Implemented
  cockpitInvulnChance?: number; // Implemented
  reflectOnDamagePercent?: number;
  reflectCanCrit?: boolean;

  // Regen / Utility (future)
  regenPerSecond?: number;
  [key: string]: number | boolean | undefined; // fallback to allow extensibility
}
