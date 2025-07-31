// src/game/boss/interfaces/BossDefinition.ts

export interface BossDefinition {
  id: string;                   // Unique key, e.g. 'flame_lord'
  name: string;                 // Display name
  shipJsonPath: string;         // Relative path to /assets/ships/boss/*.json
  initialState: string;         // Name of default FSM state
  maxHealth: number;            // Scalar HP pool for boss entity

  // Future fields:
  // dialoguePath?: string;
  // affixes?: string[];
}
