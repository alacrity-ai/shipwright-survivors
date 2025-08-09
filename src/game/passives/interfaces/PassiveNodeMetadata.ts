// src/game/passives/interfaces/PassiveNodeMetadata.ts

/**
 * Strongly-typed passive effect keys and their data types.
 * Ensures type safety for all metadata payloads in passive nodes.
 */
export interface PassiveNodeMetadata {
  // Offensive
  damage?: number;                     // Percentage (0.05 = +5%)
  fireRate?: number;                   // Percentage
  criticalChance?: number;             // Percentage
  criticalMultiplier?: number;         // Percentage
  stunChance?: number;                 // Percentage // chance to stun enemies on hit
  bossDamage?: number;                 // Percentage // Damage done to bosses

  // Defensive
  armor?: number;                      // Flat
  mitigation?: number;                 // Percentage
  ignoreDamageChance?: number;         // Percentage

  // Movement
  thrust?: number;                     // Percentage
  turnPower?: number;                  // Percentage 
  explorer?: number;                   // Percentage // Movement speed when exploring (not attacking or being hit for a certain length of time)

  // Utility
  entropiumPickupBonus?: number;       // Percentage // Entropium pickup amount per entropium orb
  blockDropRate?: number;              // Percentage // Chance to drop blocks
  harvestRange?: number;               // Flat // Radius
  attachTierUpChance?: number;         // Percentage // Chance to upgrade block to next tier when attaching
  rareItemTradepostChance?: number;    // Percentage // Higher chance of items at tradeposts
  voidIntensity?: number;              // Percentage // Intensity of voids (spawn rate of corrupted enemies)

  // Ability
  abilityCooldown?: number;            // Percentage // Cooldown reduction of ship abilities
  abilityPower?: number;               // Percentage // Power of ship abilities

  // Incidents
  incidentSpawnChance?: number;        // Percentage // Chance for incidents to appear on the map (spawn)

  // Extendable for future mechanics
  [key: string]: number | boolean | string | string[] | undefined;
}
