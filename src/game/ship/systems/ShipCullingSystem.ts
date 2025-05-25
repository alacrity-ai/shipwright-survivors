// src/game/ship/systems/ShipCullingSystem.ts

import type { Camera } from '@/core/Camera';
import type { Ship } from '@/game/ship/Ship';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';

export class ShipCullingSystem {
  constructor(
    private readonly registry: ShipRegistry,
    private readonly camera: Camera
  ) {}

  getVisibleShips(): Ship[] {
    return this.queryShipsInRange(200); // UI-visible
  }

  getActiveAIShips(): Ship[] {
    // During initialization, return all ships
    const allShips = Array.from(this.registry.getAll());
    
    // If we're still initializing (few ships), return all of them
    if (allShips.length < 20) {
      return allShips;
    }
    
    // Otherwise, use normal culling logic
    return this.queryShipsInRange(2000); // Combat-visible
  }

  private queryShipsInRange(margin: number): Ship[] {
    const bounds = this.camera.getViewportBounds();
    const visible: Ship[] = [];

    for (const ship of this.registry.getAll()) {
      try {
        const transform = ship.getTransform?.();
        if (!transform) continue;

        const x = transform.position.x;
        const y = transform.position.y;

        const inX = x > bounds.x - margin && x < bounds.x + bounds.width + margin;
        const inY = y > bounds.y - margin && y < bounds.y + bounds.height + margin;

        if (inX && inY) {
          visible.push(ship);
        }
      } catch (error) {
        console.error("Error checking ship visibility:", error);
        // Skip this ship if there's an error
      }
    }

    return visible;
  }
}
