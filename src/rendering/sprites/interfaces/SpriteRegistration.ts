// src/rendering/spritesheet/interfaces/SpriteRegistration.ts

export interface SpriteRegistration {
  key: string;                 // Unique scene-level identifier
  sheetId: string;             // e.g. "keyboard"
  animationId: string;         // e.g. "key_a"
  x?: number;                  // Optional initial x-position
  y?: number;                  // Optional initial y-position
  visible?: boolean;           // Optional visibility toggle
}