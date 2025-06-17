// src/game/interfaces/types/BlockEntityTransform.ts

export interface BlockEntityTransform {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  rotation: number;
  angularVelocity: number;
  scale?: number | { x: number; y: number }; // Optional uniform or XY scale
}
