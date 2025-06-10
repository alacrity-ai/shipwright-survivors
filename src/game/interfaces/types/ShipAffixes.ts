// src/game/interfaces/types/ShipAffixes.ts

export interface ShipAffixes {
  fireRateMulti?: number;
  fireDamageMulti?: number;
  accuracyMulti?: number;
  energyCostMulti?: number;
  thrustPowerMulti?: number;
  turnPowerMulti?: number;
  energyChargeRateMulti?: number;
  shieldEfficiencyMulti?: number;
  shieldRadiusMulti?: number;
  shieldEnergyDrainMulti?: number;
  harvestRateMulti?: number;
  rammingDamageInflictMultiplier?: number; // Fixed naming
  rammingArmorMultiplier?: number; // Fixed naming
}
