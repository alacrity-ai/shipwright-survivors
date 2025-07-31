// src/game/boss/interfaces/BossDefinition.ts

export interface BossDefinition {
  id: string;                   // Unique key, e.g. 'flame_lord'
  name: string;                 // Display name
  shipJsonPath: string;         // Relative path to /assets/ships/boss/*.json
  initialState: string;         // Name of default FSM state (even if unused for now)
  // Future fields:
  // dialoguePath?: string;
  // affixes?: string[];
}
