// src/game/planets/interfaces/PlanetDefinition.ts

export interface PlanetDefinition {
  name: string;                         // Unique identifier
  imagePath: string;                   // Relative or absolute image asset path
  scale: number;                       // Render scale multiplier (1.0 = native size)
  interactionDialogueId: string;       // Dialogue ID for landing/interaction
  approachDialogueId?: string;         // Dialogue ID for approaching the planet
  tradePostId?: string;                // Trade post ID for this planet
}
