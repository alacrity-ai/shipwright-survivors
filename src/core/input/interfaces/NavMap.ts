// src/core/input/interfaces/NavMap.ts

export interface NavPoint {
  gridX: number;
  gridY: number;
  screenX: number;
  screenY: number;
  isEnabled: boolean;
}

export type NavMap = NavPoint[]; // Unordered array of discrete nav points
