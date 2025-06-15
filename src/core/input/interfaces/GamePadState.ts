// src/core/input/interfaces/GamePadState.ts

export interface GamePadState {
  buttons: Record<string, boolean>;
  justPressed: Set<string>;
  justReleased: Set<string>;
  leftStick: { x: number; y: number };
  rightStick: { x: number; y: number };
  connected: boolean;
}