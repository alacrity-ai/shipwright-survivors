// src/game/spatialbodies/definitions/alienDefinitions.ts

import type { SpatialBodyDefinition } from '@/game/spatialbodies/interfaces/SpatialBodyDefinition';

const atlas = 'assets/spatialbodies/alien/atlas.png';

export const alienSlice1: SpatialBodyDefinition = {
  name: 'alien-01',
  atlasIndex: 0,
  baseScale: 1110.2, // largest piece, scaled similar to big ice asteroid
  uMin: 0.001057,
  vMin: 0.002169,
  uMax: 0.365222,
  vMax: 0.996746,
};

export const alienSlice2: SpatialBodyDefinition = {
  name: 'alien-02',
  atlasIndex: 0,
  baseScale: 900, // medium-large
  uMin: 0.367336,
  vMin: 0.002169,
  uMax: 0.546512,
  vMax: 0.623644,
};

export const alienSlice3: SpatialBodyDefinition = {
  name: 'alien-03',
  atlasIndex: 0,
  baseScale: 700,
  uMin: 0.548626,
  vMin: 0.002169,
  uMax: 0.658034,
  vMax: 0.402386,
};

export const alienSlice5: SpatialBodyDefinition = {
  name: 'alien-05',
  atlasIndex: 0,
  baseScale: 650,
  uMin: 0.660148,
  vMin: 0.002169,
  uMax: 0.782770,
  vMax: 0.372017,
};

export const alienSlice4: SpatialBodyDefinition = {
  name: 'alien-04',
  atlasIndex: 0,
  baseScale: 620,
  uMin: 0.784884,
  vMin: 0.002169,
  uMax: 0.901691,
  vMax: 0.350325,
};

export const alienSlice6: SpatialBodyDefinition = {
  name: 'alien-06',
  atlasIndex: 0,
  baseScale: 400,
  uMin: 0.903805,
  vMin: 0.002169,
  uMax: 0.998943,
  vMax: 0.227766,
};
