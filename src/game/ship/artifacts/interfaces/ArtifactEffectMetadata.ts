export interface ArtifactEffectMetadata {
  // Universal effects
  cockpitArmorBonus?: number; // Flat
  energyCapacityBonus?: number;
  energyRegenRate?: number;
  movementSpeedMultiplier?: number;
  alwaysSuperPulse?: boolean;
  blockRepairSpeed?: number;
  blockDropRateBonus?: number;
  entropiumPickupBonus?: number;

  // Weapon-specific enhancements
  turretFiringRate?: number;
  turretDamageMultiplier?: number;
  seekerTrackingBonus?: number;
  heatSeekersTargetNearest?: boolean;
  explosiveLanceStunChance?: number;
  laserPiercingBonus?: number;

  // Defensive/Utility traits
  shieldCapacityBonus?: number;
  shieldRechargeRate?: number;
  damageReflectionChance?: number;
  chanceToReflectTurretProjectiles?: number;
  reviveOnDeath?: boolean;

  // Artifact-specific mechanics
  spawnExtraDrone?: boolean;
  attractPickupsInRadius?: number;
  deployTemporaryShieldOnHit?: boolean;
  solarCapacitorSpecial?: boolean;

  // Start-up alterations
  startingBlocks?: string[]; // Injected blocks at ship spawn time

  // Future slots reserved for status effects, passive triggers, etc.
}
