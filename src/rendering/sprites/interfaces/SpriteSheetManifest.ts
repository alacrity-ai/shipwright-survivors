// src/rendering/sprites/interfaces/SpriteSheetManifest.ts

export interface SpriteSheetManifestEntry {
  path: string;         // Relative asset path (resolved via getAssetPath)
  cols: number;         // Number of columns in the grid
  rows: number;         // Number of rows in the grid
  frameWidth: number;   // Width of a single frame (px)
  frameHeight: number;  // Height of a single frame (px)
}

export type SpriteSheetManifest = Record<string, SpriteSheetManifestEntry>;
