// src/game/powerups/types/PowerupMetadataTypes.ts

export interface PowerupEffectMetadata {
  // Offense
  critChance?: number;
  critMultiplier?: number;
  critChainChance?: number;
  critLifeStealPercent?: number;
  baseDamageMultiplier?: number;
  fireRateMultiplier?: number;

  // Defense
  flatDamageReductionPercent?: number;
  cockpitInvulnChance?: number;
  reflectOnDamagePercent?: number;
  reflectCanCrit?: boolean;

  // Regen / Utility (future)
  regenPerSecond?: number;
  [key: string]: number | boolean | undefined; // fallback to allow extensibility
}
