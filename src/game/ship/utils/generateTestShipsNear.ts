import { Ship } from '@/game/ship/Ship';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { Grid } from '@/systems/physics/Grid';

/**
 * Spawns N small ships in a radial pattern around a central position.
 * Useful for debugging MultiShipRenderer and ShipCullingSystem.
 */
export function generateTestShipsNear(
  center: { x: number; y: number },
  registry: ShipRegistry,
  count: number = 6,
  radius: number = 300,
  grid: Grid
): void {
  const angleStep = (2 * Math.PI) / count;

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius;

    const ship = new Ship(grid);

    // === Minimalist NPC ship ===
    ship.placeBlockById({ x: 0, y: 0 }, 'cockpit');
    ship.placeBlockById({ x: 0, y: 1 }, 'engine0');
    ship.placeBlockById({ x: -1, y: 0 }, 'turret0');
    ship.placeBlockById({ x: 1, y: 0 }, 'turret0');

    // Assign world transform directly (assumes you're using getTransform())
    ship.getTransform().position.x = x;
    ship.getTransform().position.y = y;

    registry.add(ship);
  }
}
