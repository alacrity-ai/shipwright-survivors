// src/rendering/unified/interfaces/SpecialFxInstance.ts

export interface SpecialFxInstance {
  worldX: number;     // World-space anchor X
  worldY: number;     // World-space anchor Y
  radius: number;     // Visual radius of effect
  time: number;       // Seconds since effect began
  type: number;       // Effect type ID (0 = ripple, 1 = shimmer/test, etc.)
  strength: number;   // Arbitrary effect strength/intensity (e.g. distortion magnitude)
  duration: number;   // Lifetime in seconds
}
