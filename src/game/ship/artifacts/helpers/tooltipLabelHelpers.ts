// src/game/ship/artifacts/helpers/tooltipLabelHelpers.ts

export function formatLabel(key: string): string {
  const map: Record<string, string> = {
    // Damage Universal
    outgoingDamageMultiplier: 'Damage Dealt',
    incomingDamageMultiplier: 'Damage Taken',
    baseLifestealPercentage: 'Lifesteal',
    criticalHitChanceBonus: 'Crit Chance',
    criticalHitMultiplierBonus: 'Crit Damage',
    damageScalingWithMass: 'Damage Scales with Mass',

    // Defensive/Utility traits
    cockpitArmorBonus: 'Cockpit Armor',
    collisionDamageMitigationMultiplier: 'Collision Resistance',
    chanceToReflectTurretProjectiles: 'Reflect Chance (Turrets)',
    blockHP5s: 'Block Regen (5s)',
    radialKnockbackPulseInterval: 'Knockback Pulse Interval',
    periodicOneHitShieldInterval: 'Shield Recharge Interval',
    blockSurvivalChance: 'Block Survival Chance',
    blockDurabilityMultiplier: 'Block Durability',

    // Movement
    thrustMultiplier: 'Thrust Multiplier',

    // Weapon-specific
    heatSeekersTargetNearest: 'Heatseeker Targeting',

    // Artifact-specific mechanics
    alwaysSuperPulse: 'Always Super Pulse',
    attractPickupsInRadius: 'Pickup Magnet Radius',
    deployTemporaryShieldOnHit: 'Shield on Hit',
    solarCapacitorSpecial: 'Solar Explosion',

    // Start-up alterations
    startingBlocks: 'Starting Blocks',

    // Gambling / Economy
    blockGamblingUpgradeBias: 'Upgrade Bias (Rolls)',
    tradePostPriceReduction: 'Trade Post Discount',
    convertPlacedBlocksToEntropium: 'Convert Blocks to Entropium',
    spawnRandomBlockInterval: 'Random Block Interval',
    blockDropRateBonus: 'Block Drop Rate',
    entropiumPickupBonus: 'Entropium Bonus',
    imprintFirstPlacedBlock: 'Imprint First Block',
    imprintDropBias: 'Imprint Bias',
    blockQueueUpgradeInterval: 'Queue Upgrade Interval',
    randomStartingBlockTier1: 'Start with Tier 1 Block',
    maximumBlockQueueSizeIncrease: 'Max Block Queue Size',
    pickupAttractionRangeIncrease: 'Pickup Attraction Range',

    // Revive
    reviveOnDeath: 'Auto-Revive',
    reviveBlockRetentionRatio: 'Block Retention on Death',

    // Status
    statusEffectOnSelfDurationMultiplier: 'Status Duration (Self)',
    reflectStatusEffectsToEnemies: 'Reflect Status Effects',
    damageToStatusedEnemiesMultiplier: 'Damage to Statused Enemies',
    inflictedStatusDurationMultiplier: 'Inflicted Status Duration',

    // On kill / on damage effects
    onKillHasteDuration: 'Haste Duration (on Kill)',
    releaseShrapnelOnBlockDestruction: 'Shrapnel on Block Destruction',

    // Escorts
    enemyRespawnAsEscortChance: 'Escort Spawn-on-Kill Chance',
    escortDamageMultiplier: 'Escort Damage',
    escortSpeedMultiplier: 'Escort Speed',
    summonEidolonInterval: 'Eidolon Interval',
    summonEidolonDuration: 'Eidolon Duration',

    // Incidents
    incidentSpawnRateMultiplier: 'Incident Frequency',
    incidentDamageMultiplier: 'Damage Bonus in Incidents',

    // Negative
    blockDecayRate: 'Block Decay Rate',
    disableCriticalHits: 'Disable Critical Hits',
    disableStatusInfliction: 'Disable Status Infliction',

    // Unique
    markedByFate: 'Marked by Fate',
    optionalBossSummonChance: 'Boss Summon Chance',
    onBlockDestroyedDamageBuff: 'Damage Buff on Block Destruction',
    convertDamageToOverTime: 'All Damage Dealt Over Time',
  };

  return map[key] ?? key;
}


export function formatValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? '✓' : '✗';

  if (typeof value === 'number') {
    if (Number.isInteger(value)) return `${value}`;
    const percentage = (value * 100).toFixed(1).replace(/\.0$/, '');

    if (value > 0) return `+${percentage}%`;
    return `${percentage}%`;
  }

  if (Array.isArray(value)) {
    return `[${value.join(', ')}]`;
  }

  return String(value);
}
