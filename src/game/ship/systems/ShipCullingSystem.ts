// src/game/ship/systems/ShipCullingSystem.ts

import { ShipGrid } from '@/game/ship/ShipGrid';
import { Ship } from '@/game/ship/Ship';

export class ShipCullingSystem {
  constructor(
    private readonly shipGrid: ShipGrid
  ) {}

  getVisibleShips(): Ship[] {
    return this.shipGrid.getShipsInCameraView(250);
  }

  getActiveAIShips(): Ship[] {
    return this.shipGrid.getShipsInCameraView(2000);
  }
}
