// src/game/planets/PlanetFactory.ts
import type { Ship } from '@/game/ship/Ship';
import type { InputManager } from '@/core/InputManager';
import type { Camera } from '@/core/Camera';
import type { WaveOrchestrator } from '@/game/waves/orchestrator/WaveOrchestrator';
import type { MissionDialogueManager } from '@/systems/dialogue/MissionDialogueManager';

import { PlanetController } from './PlanetController';
import { PlanetRegistry } from './PlanetRegistry';

export const PlanetFactory = {
  createPlanetByName(
    name: string,
    x: number,
    y: number,
    playerShip: Ship | null,
    inputManager: InputManager,
    camera: Camera,
    waveOrchestrator: WaveOrchestrator,
    missionDialogueManager: MissionDialogueManager
  ): PlanetController {
    const def = PlanetRegistry.getPlanetByName(name);
    return new PlanetController(x, y, playerShip, inputManager, camera, def, waveOrchestrator, missionDialogueManager);
  }
};
