// src/game/spatialbodies/definitions/crystalDefinitions.ts

import type { SpatialBodyDefinition } from '@/game/spatialbodies/interfaces/SpatialBodyDefinition';

const atlas = 'assets/spatialbodies/crystal/atlas.png';

export const crystalSlice1: SpatialBodyDefinition = {
  name: 'crystal-01',
  atlasIndex: 0,
  baseScale: 1110.2, // large slice, similar to your iceAsteroid04 scale
  uMin: 0.001333,
  vMin: 0.002123,
  uMax: 0.433333,
  vMax: 0.996815,
};

export const crystalSlice2: SpatialBodyDefinition = {
  name: 'crystal-02',
  atlasIndex: 0,
  baseScale: 900, // medium-large
  uMin: 0.436000,
  vMin: 0.002123,
  uMax: 0.666667,
  vMax: 0.686837,
};

export const crystalSlice3: SpatialBodyDefinition = {
  name: 'crystal-03',
  atlasIndex: 0,
  baseScale: 700,
  uMin: 0.669333,
  vMin: 0.002123,
  uMax: 0.792000,
  vMax: 0.409766,
};

export const crystalSlice4: SpatialBodyDefinition = {
  name: 'crystal-04',
  atlasIndex: 0,
  baseScale: 600,
  uMin: 0.794667,
  vMin: 0.002123,
  uMax: 0.905333,
  vMax: 0.345011,
};

export const crystalSlice5: SpatialBodyDefinition = {
  name: 'crystal-05',
  atlasIndex: 0,
  baseScale: 400,
  uMin: 0.908000,
  vMin: 0.002123,
  uMax: 0.998667,
  vMax: 0.211253,
};
