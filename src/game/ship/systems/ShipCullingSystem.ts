// src/game/ship/systems/ShipCullingSystem.ts

import { ShipGrid } from '@/game/ship/ShipGrid';
import { Ship } from '@/game/ship/Ship';

export class ShipCullingSystem {
  constructor() {}

  getVisibleShips(): Ship[] {
    return ShipGrid.getInstance().getShipsInCameraView(250);
  }

  getActiveAIShips(): Ship[] {
    return ShipGrid.getInstance().getShipsInCameraView(2000);
  }
}
