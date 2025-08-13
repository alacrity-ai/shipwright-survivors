// src/game/passives/interfaces/PassiveNodeMetadata.ts

/**
 * Strongly-typed passive effect keys and their data types.
 * Ensures type safety for all metadata payloads in passive nodes.
 */
export interface PassiveNodeMetadata {
  // Offensive
  damage?: number;                     // [x] Percentage (0.05 = +5%)
  fireRate?: number;                   // [x] Percentage
  criticalChance?: number;             // [x] Percentage
  criticalMultiplier?: number;         // [x] Percentage
  stunChance?: number;                 // Percentage // chance to stun enemies on hit
  bossDamage?: number;                 // Percentage // Damage done to bosses
  lifeStealChance?: number;            // Percentage // Life steal on hit
  lifeStealAmount?: number;            // Percentage // Amount of life stolen on hit
  coldDuration?: number;               // Percentage // Duration of cold effects
  igniteDamage?: number;                // Percentage // Damage of ignite effects

  // Defensive
  armor?: number;                      // [x] Flat
  mitigation?: number;                 // [x] Percentage
  ignoreDamageChance?: number;         // [x] Percentage
  acclmatization?: number;             // Percentage // Cold resistance
  thermalInsulation?: number;          // Percentage // Fire resistance
  ignoreStatusChance?: boolean;        // Percentage // Chance to ignore status effects
  rammer?: boolean;                    // Boolean // Rammer (ignore damage from below)

  // Movement
  thrust?: number;                     // [x] Percentage
  turnPower?: number;                  // [x] Percentage 
  explorer?: number;                   // Percentage // Movement speed when exploring (not attacking or being hit for a certain length of time)
  kineticWard?: number;                // Percentage // Movement-slow resistance
  jumpcastSpeed?: number;              // Percentage // Speed of jumpcast channeling
  globalJumpcast?: boolean;            // Boolean // Can jumpcast anywhere

  // Utility
  entropiumPickupBonus?: number;       // [x] Percentage // Entropium pickup amount per entropium orb
  blockDropRate?: number;              // [x] Percentage // Chance to drop blocks
  harvestRange?: number;               // [x] Flat // Radius
  attachTierUpChance?: number;         // Percentage // Chance to upgrade block to next tier when attaching
  rareItemTradepostChance?: number;    // Percentage // Higher chance of items at tradeposts
  voidIntensity?: number;              // Percentage // Intensity of voids (spawn rate of corrupted enemies)
  powerSurge?: number;                  // Increased chance of rare powerups
  epicInfusion?: number;                // Chance for Epic powerups
  repairBounty?: number;                // Chance for repair orbs
  repairAmplification?: number;         // Percentage // Amplification of repair orbs
  coreBonus?: number;                  // Percentage // Increased cores awarded
  luckyDice?: boolean;                  // Boolean // Lucky dice (random passive effect)
  doubleCombine?: boolean;              // Boolean // Double combine (combine two blocks into one)
  alchemist?: boolean;                  // Boolean // Alchemist (convert blocks into entropium)

  // Escorts
  escortDamage?: number;                // Percentage // Damage done by escorts
  escortSpeed?: number;                 // Percentage // Speed of escorts
  escortArmor?: number;                 // Flat // Armor of escorts
  escortImmunity?: number;              // Percentage // Chance for escorts to ignore damage
  escortResurrectionSpeed?: number;     // Percentage // Speed at which escorts are resurrected

  // Ability
  abilityCooldown?: number;            // Percentage // Cooldown reduction of ship abilities
  abilityPower?: number;               // Percentage // Power of ship abilities

  // Incidents
  incidentSpawnChance?: number;        // Percentage // Chance for incidents to appear on the map (spawn)

  // Extendable for future mechanics
  [key: string]: number | boolean | string | string[] | undefined;
}
