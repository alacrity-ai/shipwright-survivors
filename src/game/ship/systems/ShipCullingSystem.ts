// src/game/ship/systems/ShipCullingSystem.ts

import { ShipGrid } from '@/game/ship/ShipGrid';
import { Ship } from '@/game/ship/Ship';

export class ShipCullingSystem {
  constructor() {}

  /**
   * Returns a *copy* of ships visible in the camera view.
   * Allocates a new array each call to avoid sharing ShipGrid's scratch buffer.
   */
  getVisibleShips(): Ship[] {
    const { ships, count } = ShipGrid.getInstance().getShipsInCameraView(250);
    const result = new Array<Ship>(count);
    for (let i = 0; i < count; i++) {
      result[i] = ships[i];
    }
    return result;
  }

  /**
   * Returns a *copy* of ships considered "active" for AI purposes.
   * Allocates a new array each call to avoid sharing ShipGrid's scratch buffer.
   */
  getActiveAIShips(): Ship[] {
    const { ships, count } = ShipGrid.getInstance().getShipsInCameraView(2000);
    const result = new Array<Ship>(count);
    for (let i = 0; i < count; i++) {
      result[i] = ships[i];
    }
    return result;
  }
}
