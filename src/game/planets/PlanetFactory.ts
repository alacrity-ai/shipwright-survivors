// src/game/planets/PlanetFactory.ts
import type { Ship } from '@/game/ship/Ship';
import type { InputManager } from '@/core/InputManager';
import type { Camera } from '@/core/Camera';
import type { WaveSpawner } from '@/systems/wavespawner/WaveSpawner';

import { PlanetController } from './PlanetController';
import { PlanetRegistry } from './PlanetRegistry';

export const PlanetFactory = {
  createPlanetByName(
    name: string,
    x: number,
    y: number,
    playerShip: Ship,
    inputManager: InputManager,
    camera: Camera,
    waveSpawner: WaveSpawner
  ): PlanetController {
    const def = PlanetRegistry.getPlanetByName(name);
    return new PlanetController(x, y, playerShip, inputManager, camera, def, waveSpawner);
  }
};
