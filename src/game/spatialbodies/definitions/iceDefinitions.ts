// src/game/spatialbodies/definitions/iceDefinitions.ts

import type { SpatialBodyDefinition } from '@/game/spatialbodies/interfaces/SpatialBodyDefinition';

const atlas = 'assets/spatialbodies/ice/atlas.png';

export const iceAsteroid04: SpatialBodyDefinition = {
  name: 'ice-04',
  atlasIndex: 0,
  baseScale: 1110.2,
  uMin: 0.001017,
  vMin: 0.001938,
  uMax: 0.521872,
  vMax: 0.994186,
};

export const iceAsteroid03: SpatialBodyDefinition = {
  name: 'ice-03',
  atlasIndex: 0,
  baseScale: 1110.2,
  uMin: 0.523906,
  vMin: 0.001938,
  uMax: 0.794507,
  vMax: 0.517442,
};

export const iceAsteroid01: SpatialBodyDefinition = {
  name: 'ice-01',
  atlasIndex: 0,
  baseScale: 512,
  uMin: 0.796541,
  vMin: 0.001938,
  uMax: 0.998983,
  vMax: 0.387597,
};

export const iceAsteroid00: SpatialBodyDefinition = {
  name: 'ice-00',
  atlasIndex: 0,
  baseScale: 512,
  uMin: 0.796541,
  vMin: 0.391473,
  uMax: 0.968973,
  vMax: 0.719961,
};

export const iceAsteroid02: SpatialBodyDefinition = {
  name: 'ice-02',
  atlasIndex: 0,
  baseScale: 512,
  uMin: 0.796541,
  vMin: 0.723837,
  uMax: 0.940488,
  vMax: 0.998062,
};
