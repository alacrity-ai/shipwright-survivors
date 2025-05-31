// src/game/waves/types/WaveDefinition.ts

export interface WaveDefinition {
  id: number;
  type: 'wave' | 'boss' | string;
  mods: string[];
  ships: {
    shipId: string;
    count: number;
  }[];
}