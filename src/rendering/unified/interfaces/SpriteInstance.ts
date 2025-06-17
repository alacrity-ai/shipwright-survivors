// src/rendering/unified/interfaces/SpriteInstance.ts

// Assume Float32Array layout per instance:
interface SpriteInstance {
  x: number;       // aInstancePos.x (location = 1)
  y: number;       // aInstancePos.y
  width: number;   // aInstanceSize.x (location = 2)
  height: number;  // aInstanceSize.y
  alpha: number;   // aInstanceAlpha (location = 3)
}
