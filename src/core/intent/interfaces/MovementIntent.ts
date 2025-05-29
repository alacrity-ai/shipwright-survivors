// src/core/intent/interfaces/MovementIntent.ts

export interface MovementIntent {
  thrustForward: boolean;
  brake: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  strafeLeft: boolean; // New
  strafeRight: boolean; // New
}
