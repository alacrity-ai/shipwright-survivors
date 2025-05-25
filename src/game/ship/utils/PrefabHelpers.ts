import { Ship } from '@/game/ship/Ship';
import type { Grid } from '@/systems/physics/Grid';

export function getStarterShip(grid: Grid) {
      const ship = new Ship(grid);
  
      // Initialize ship with blocks
      ship.placeBlockById({ x: 0, y: -3 }, 'hull3');
      ship.placeBlockById({ x: 0, y: 0 }, 'cockpit');
      ship.placeBlockById({ x: 0, y: -1 }, 'hull3');
      ship.placeBlockById({ x: 0, y: -2 }, 'turret3');
      ship.placeBlockById({ x: -1, y: -1 }, 'fin3');
      ship.placeBlockById({ x: 1, y: -1 }, 'fin3', 90);
      ship.placeBlockById({ x: 1, y: 0 }, 'hull3');
      ship.placeBlockById({ x: -1, y: 0 }, 'hull3');
      ship.placeBlockById({ x: 2, y: 0 }, 'turret3', 90);
      ship.placeBlockById({ x: -2, y: 0 }, 'turret3');
      ship.placeBlockById({ x: 0, y: 1 }, 'engine3');
      ship.placeBlockById({ x: -1, y: 1 }, 'engine3');
      ship.placeBlockById({ x: 1, y: 1 }, 'engine3');
  
      return ship;
}