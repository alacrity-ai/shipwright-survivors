// src/game/interfaces/types/BlockEntityTransform.ts

export interface BlockEntityTransform {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  rotation: number;
  angularVelocity: number;
}
