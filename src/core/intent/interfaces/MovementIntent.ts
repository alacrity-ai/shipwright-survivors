// src/core/intent/interfaces/MovementIntent.ts

export interface MovementIntent {
  thrustForward: boolean;
  brake: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  turnToAngle?: number; // radians, 0 is "up"
  afterburner?: boolean; // NEW!
}
