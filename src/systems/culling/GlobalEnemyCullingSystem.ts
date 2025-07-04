// src/systems/culling/GlobalEnemyCullingSystem.ts

import { ShipGrid } from '@/game/ship/ShipGrid';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { destroyEntityExternally } from '@/core/interfaces/events/EntityReporter';
import type { Ship } from '@/game/ship/Ship';

// src/shared/vectorUtils.ts

export function getDistanceSquared(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}


export class GlobalEnemyCullingSystem {
  private static readonly CULL_RADIUS = 5000;
  private static readonly CULL_RADIUS_SQ = GlobalEnemyCullingSystem.CULL_RADIUS ** 2;

  private static readonly CULL_INTERVAL = 0.01;
  private static readonly ENEMY_CAP = 100;
  private static readonly RADIUS_FETCH_PADDING = 3000;

  private timeSinceLastCheck = 0;

  private readonly shipGrid = ShipGrid.getInstance();
  private readonly shipRegistry = ShipRegistry.getInstance();

  public update(dt: number): void {
    this.timeSinceLastCheck += dt;
    if (this.timeSinceLastCheck < GlobalEnemyCullingSystem.CULL_INTERVAL) return;
    this.timeSinceLastCheck = 0;

    const playerShip = this.shipRegistry.getPlayerShip();
    if (!playerShip) return;

    const playerFaction = playerShip.getFaction();
    const playerPos = playerShip.getTransform().position;
    const px = playerPos.x;
    const py = playerPos.y;

    // === Spatial fetch: Nearby candidates (with buffer)
    const fetchRadius = GlobalEnemyCullingSystem.CULL_RADIUS + GlobalEnemyCullingSystem.RADIUS_FETCH_PADDING;
    const nearbyCandidates = this.shipGrid.getShipsInRadius(px, py, fetchRadius, playerFaction);

    // === Distance-based culling
    for (let i = 0; i < nearbyCandidates.length; i++) {
      const ship = nearbyCandidates[i];
      if (ship.getIsPlayerShip()) continue;
      if (ship.hasTag?.('persistent')) continue;

      const pos = ship.getTransform().position;
      const dx = pos.x - px;
      const dy = pos.y - py;
      const distSq = dx * dx + dy * dy;

      if (distSq > GlobalEnemyCullingSystem.CULL_RADIUS_SQ) {
        ship.setDestructionCause('replaced');
        destroyEntityExternally(ship, 'replaced');
      }
    }

    // === Global cap enforcement
    const allEnemies = this.shipGrid.getAllShips(playerFaction);

    let overflowShips: { ship: Ship; distSq: number }[] = [];
    let activeCount = 0;

    for (let i = 0; i < allEnemies.length; i++) {
      const ship = allEnemies[i];
      if (ship.getIsPlayerShip()) continue;
      if (ship.hasTag?.('persistent')) continue;

      activeCount++;
      const pos = ship.getTransform().position;
      const dx = pos.x - px;
      const dy = pos.y - py;
      overflowShips.push({ ship, distSq: dx * dx + dy * dy });
    }

    const surplus = activeCount - GlobalEnemyCullingSystem.ENEMY_CAP;
    if (surplus > 0) {
      overflowShips.sort((a, b) => b.distSq - a.distSq); // Farthest first
      for (let i = 0; i < surplus; i++) {
        const ship = overflowShips[i].ship;
        ship.setDestructionCause('replaced');
        destroyEntityExternally(ship, 'replaced');
      }
    }
  }
}
