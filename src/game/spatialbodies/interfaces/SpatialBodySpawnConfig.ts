// src/game/spatialbodies/interfaces/SpatialBodySpawnConfig.ts

export interface SpatialBodySpawnConfig {
  type: string;           // Registry key
  count: number;
  scaleVariance: number;  // ±percentage (0.25 = ±25%)
}
