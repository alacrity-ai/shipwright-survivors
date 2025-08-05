// ─────────────────────────────────────────────────────────────
// src/game/clouds/CloudRegionRegistry.ts
// Centralized registry for spatial cloud region definitions.
// Supports named groups of circular CloudRegions for each area.
// ─────────────────────────────────────────────────────────────

import type { CloudRegion, CloudParams, Vec2 } from '@/systems/fx/CloudManager';

const registry = new Map<string, CloudRegion[]>();

export const CloudRegionRegistry = {
  register(id: string, regions: CloudRegion[]): void {
    registry.set(id, regions);
  },

  get(id: string): CloudRegion[] {
    return registry.get(id) ?? [];
  },

  list(): string[] {
    return [...registry.keys()];
  },
};

export const mistyBasinCloudRegions: CloudRegion[] = [
  {
    id: 'misty-01',
    center: { x: 16000, y: -2000 },
    radius: 8000,
    frontParams: {
      speed: 0.5,
      density: 1.2,
      quantity: 2.0,
      scale: 3.0,
      alpha: 0.10,
      color: [0.8, 0.8, 0.8],
    },
    backParams: {
      speed: 0.5,
      density: 1.2,
      quantity: 2.0,
      scale: 1.0,
      alpha: 0.18,
      color: [0.2, 0.2, 0.8],
    },
  },
  {
    id: 'misty-02',
    center: { x: -7000, y: 20000 },
    radius: 8000,
    frontParams: {
      speed: 0.5,
      density: 1.2,
      quantity: 2.0,
      scale: 3.0,
      alpha: 0.10,
      color: [0.6, 0.6, 0.9],
    },
    backParams: {
      speed: 0.5,
      density: 1.2,
      quantity: 2.0,
      scale: 1.0,
      alpha: 0.18,
      color: [0.2, 0.2, 0.8],
    },
  },
  {
    id: 'misty-03',
    center: { x: -20000, y: -16000 },
    radius: 8000,
    frontParams: {
      speed: 0.5,
      density: 1.2,
      quantity: 2.0,
      scale: 3.0,
      alpha: 0.10,
      color: [0.6, 0.6, 0.9],
    },
    backParams: {
      speed: 0.5,
      density: 1.2,
      quantity: 2.0,
      scale: 1.0,
      alpha: 0.18,
      color: [0.2, 0.2, 0.8],
    },
  },
];

CloudRegionRegistry.register('misty-basin', mistyBasinCloudRegions);
