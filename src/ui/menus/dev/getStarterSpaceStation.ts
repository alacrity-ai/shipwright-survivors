// src/game/entities/factories/getStarterSpaceStation.ts

import type { Grid } from '@/systems/physics/Grid';
import { SpaceStation } from '@/game/entities/SpaceStation';

export function getStarterSpaceStation(): SpaceStation {
  const station = new SpaceStation();
  station.placeBlockById({ x: -10000, y: 10000 }, 'hull1');
  return station;
}
