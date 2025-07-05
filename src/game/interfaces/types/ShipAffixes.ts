// src/game/interfaces/types/ShipAffixes.ts

export interface ShipAffixes {
  fireRateMulti?: number;
  fireDamageMulti?: number; // Not implemented yet
  projectileSpeedMulti?: number;
  projectileLifetimeMulti?: number;
  accuracyMulti?: number; // Not implemented yet
  energyCostMulti?: number; // Not implemented yet
  thrustPowerMulti?: number;
  turnPowerMulti?: number;
  blockDurabilityMulti?: number;
  energyChargeRateMulti?: number; // Not implemented yet
  shieldEfficiencyMulti?: number; // Not implemented yet
  shieldRadiusMulti?: number; // Not implemented yet
  shieldEnergyDrainMulti?: number; // Not implemented yet
  harvestRateMulti?: number; // Not implemented yet
  rammingDamageInflictMultiplier?: number;
  rammingArmorMultiplier?: number;
  invulnerable?: boolean;
  blockDropRateMulti?: number;
}
