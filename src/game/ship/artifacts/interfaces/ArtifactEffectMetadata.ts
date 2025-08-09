export interface ArtifactEffectMetadata {
  // Damage Universal
  outgoingDamageMultiplier?: number; // Multiplies outgoing damage
  incomingDamageMultiplier?: number; // Multiplies incoming damage
  baseLifestealPercentage?: number;
  criticalHitChanceBonus?: number;
  criticalHitMultiplierBonus?: number;
  damageScalingWithMass?: boolean;
  
  // Defensive/Utility traits
  cockpitArmorBonus?: number; // Flat
  collisionDamageMitigationMultiplier?: number;
  chanceToReflectTurretProjectiles?: number;
  blockHP5s?: number;
  radialKnockbackPulseInterval?: number;
  periodicOneHitShieldInterval?: number;
  blockSurvivalChance?: number;
  blockDurabilityMultiplier?: number;

  // Movement
  thrustMultiplier?: number;

  // Weapon specific
  heatSeekersTargetNearest?: boolean;

  // Artifact-specific mechanics
  alwaysSuperPulse?: boolean;
  attractPickupsInRadius?: number;
  deployTemporaryShieldOnHit?: boolean;
  solarCapacitorSpecial?: boolean;

  // Start-up alterations
  startingBlocks?: string[]; // Injected blocks at ship spawn time

  // Gambling / Economy
  blockGamblingUpgradeBias?: number;
  tradePostPriceReduction?: number;
  convertPlacedBlocksToEntropium?: boolean;
  spawnRandomBlockInterval?: number;
  blockDropRateBonus?: number;
  entropiumPickupBonus?: number;
  imprintFirstPlacedBlock?: boolean;
  imprintDropBias?: number;
  blockQueueUpgradeInterval?: number;
  randomStartingBlockTier1Weapon?: boolean;
  maximumBlockQueueSizeIncrease?: number;
  pickupAttractionRangeIncrease?: number;

  // Revive
  reviveOnDeath?: boolean;
  reviveBlockRetentionRatio?: number;

  // Status
  statusEffectOnSelfDurationMultiplier?: number;
  reflectStatusEffectsToEnemies?: boolean;
  damageToStatusedEnemiesMultiplier?: number;
  inflictedStatusDurationMultiplier?: number;

  // On kill / on damage effects
  onKillHasteDuration?: number;
  releaseShrapnelOnBlockDestruction?: boolean;

  // Escorts
  enemyRespawnAsEscortChance?: number;
  escortDamageMultiplier?: number;
  escortSpeedMultiplier?: number;
  summonEidolonInterval?: number;
  summonEidolonDuration?: number;

  // Incidents
  incidentSpawnRateMultiplier?: number;
  incidentDamageMultiplier?: number;

  // Negative
  blockDecayRate?: number;
  disableCriticalHits?: boolean;
  disableStatusInfliction?: boolean;

  // Unique
  markedByFate?: boolean;
  optionalBossSummonChance?: number;
  onBlockDestroyedDamageBuff?: boolean;
  convertDamageToOverTime?: boolean;
}
