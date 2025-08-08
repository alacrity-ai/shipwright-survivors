// src/game/passives/interfaces/PassiveNodeMetadata.ts

/**
 * Strongly-typed passive effect keys and their data types.
 * Ensures type safety for all metadata payloads in passive nodes.
 */
export interface PassiveNodeMetadata {
  // Offensive
  damage?: number;            // Percentage (0.05 = +5%)
  fireRate?: number;          // Percentage

  // Defensive
  armor?: number;             // Flat
  mitigation?: number;        // Percentage

  // Movement
  thrust?: number;            // Percentage
  turnPower?: number;         // Percentage

  // Utility
  entropiumPickupBonus?: number; // Percentage
  blockDropRate?: number;        // Percentage
  harvestRange?: number;         // Flat

  // Ability
  abilityCooldown?: number;   // Percentage
  abilityPower?: number;      // Percentage

  // Capstone Booleans
  slayer?: boolean;
  voidwalker?: boolean;
  atronach?: boolean;
  incidentInvestigator?: boolean;
  builder?: boolean;
  trademaster?: boolean;
  explorer?: boolean;
  bossMastery?: boolean;

  // Extendable for future mechanics
  [key: string]: number | boolean | string | string[] | undefined;
}
