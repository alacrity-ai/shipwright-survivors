// src/game/spatialbodies/interfaces/SpatialBodyDefinition.ts

export interface SpatialBodyDefinition {
  name: string;         // Registry key
  atlasIndex: number;   // Numeric ID for the atlas
  baseScale: number;    // Scale in pixels

  // Normalized UV rectangle within the atlas
  uMin: number;
  vMin: number;
  uMax: number;
  vMax: number;

  effects?: number;     // Bitmask of effects (CRYSTAL = 1)
}
