// src/game/ship/utils/shipColorHelpers.ts

import type { Ship } from '@/game/ship/Ship';
import type { PreviewShip } from '@/game/ship/PreviewShip';

export enum ShipColorPreset {
  Green = 'green',
  Blue = 'blue',
  Red = 'red',
  Yellow = 'yellow',
  Purple = 'purple',
  Teal = 'teal',
  Orange = 'orange',
  White = 'white',
  Black = 'black',

  Cyan = 'cyan',
  Magenta = 'magenta',
  Lime = 'lime',
  Indigo = 'indigo',
  Amber = 'amber',
  Pink = 'pink',
}

interface ColorDefinition {
  hex: string;
  intensity: number;
}

const COLOR_MAP: Record<ShipColorPreset, ColorDefinition> = {
  [ShipColorPreset.Green]:   { hex: '#4caf50', intensity: 0.65 },
  [ShipColorPreset.Blue]:    { hex: '#2196f3', intensity: 0.65 },
  [ShipColorPreset.Red]:     { hex: '#f44336', intensity: 0.65 },
  [ShipColorPreset.Yellow]:  { hex: '#ffeb3b', intensity: 0.65 },
  [ShipColorPreset.Purple]:  { hex: '#9c27b0', intensity: 0.65 },
  [ShipColorPreset.Teal]:    { hex: '#009688', intensity: 0.65 },
  [ShipColorPreset.Orange]:  { hex: '#ff9800', intensity: 0.65 },
  [ShipColorPreset.White]:   { hex: '#ffffff', intensity: 0.65 },
  [ShipColorPreset.Black]:   { hex: '#111111', intensity: 0.65 },

  [ShipColorPreset.Cyan]:    { hex: '#00ffff', intensity: 0.85 },
  [ShipColorPreset.Magenta]: { hex: '#ff00ff', intensity: 0.85 },
  [ShipColorPreset.Lime]:    { hex: '#cddc39', intensity: 0.85 },
  [ShipColorPreset.Indigo]:  { hex: '#3f51b5', intensity: 0.85 },
  [ShipColorPreset.Amber]:   { hex: '#ffc107', intensity: 0.85 },
  [ShipColorPreset.Pink]:    { hex: '#e91e63', intensity: 0.85 },
};

export function applyShipColorPreset(
  ship: Ship | PreviewShip,
  preset: ShipColorPreset,
  overrideIntensity?: number
): void {
  const { hex, intensity } = COLOR_MAP[preset];
  ship.setBlockColor(hex);
  ship.setBlockColorIntensity(overrideIntensity ?? intensity);
}
