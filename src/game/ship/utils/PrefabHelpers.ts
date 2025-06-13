import { Ship } from '@/game/ship/Ship';
import { FiringMode } from '@/systems/combat/types/WeaponTypes';
import { Faction } from '@/game/interfaces/types/Faction';

import type { Grid } from '@/systems/physics/Grid';

export function getStarterShip(grid: Grid) {
      const ship = new Ship(grid, undefined, undefined, true, undefined, Faction.Player);
      ship.setIsPlayerShip(true);
  
      // Initialize ship with blocks
      ship.placeBlockById({ x: 0, y: -3 }, 'hull1');
      ship.placeBlockById({ x: 0, y: 0 }, 'cockpit1');
      ship.placeBlockById({ x: 0, y: -1 }, 'hull1');
      ship.placeBlockById({ x: 0, y: -2 }, 'turret1');
      ship.placeBlockById({ x: -1, y: -1 }, 'fin1');
      ship.placeBlockById({ x: 1, y: -1 }, 'fin1', 90);
      ship.placeBlockById({ x: 1, y: 0 }, 'hull1');
      ship.placeBlockById({ x: -1, y: 0 }, 'hull1');
      ship.placeBlockById({ x: 2, y: 0 }, 'turret1', 90);
      ship.placeBlockById({ x: -2, y: 0 }, 'turret1');
      ship.placeBlockById({ x: 0, y: 1 }, 'engine1');
      ship.placeBlockById({ x: -1, y: 1 }, 'engine1');
      ship.placeBlockById({ x: 1, y: 1 }, 'engine1');

      ship.hideAllBlocks();
      ship.setFiringMode(FiringMode.Sequence);
      return ship;
}
