// src/game/entities/factories/getStarterSpaceStation.ts

import type { Grid } from '@/systems/physics/Grid';
import { SpaceStation } from '@/game/entities/SpaceStation';

export function getStarterSpaceStation(grid: Grid): SpaceStation {
  const station = new SpaceStation(grid);
  station.placeBlockById({ x: -10000, y: 10000 }, 'hull1');
  return station;
}
