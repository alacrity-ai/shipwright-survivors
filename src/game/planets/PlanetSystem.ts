// src/game/planets/PlanetSystem.ts

import type { Ship } from '@/game/ship/Ship';
import type { InputManager } from '@/core/InputManager';
import type { Camera } from '@/core/Camera';
import type { PlanetDefinition } from './interfaces/PlanetDefinition';
import type { CanvasManager } from '@/core/CanvasManager';
import type { PlanetSpawnConfig } from '@/game/missions/types/MissionDefinition';
import type { WaveSpawner } from '@/systems/wavespawner/WaveSpawner';

import { PlanetController } from './PlanetController';
import { PlanetFactory } from './PlanetFactory';

export class PlanetSystem {
  private readonly planets: Set<PlanetController> = new Set();
  private readonly ctx: CanvasRenderingContext2D;
  private readonly overlayCtx: CanvasRenderingContext2D;
  private readonly dialogueCtx: CanvasRenderingContext2D;

  constructor(
    private readonly playerShip: Ship,
    private readonly inputManager: InputManager,
    private readonly camera: Camera,
    private readonly canvasManager: CanvasManager,
    private readonly waveSpawner: WaveSpawner
  ) {
    this.ctx = canvasManager.getContext('background');
    this.overlayCtx = canvasManager.getContext('ui');
    this.dialogueCtx = canvasManager.getContext('dialogue');
  }

  registerPlanetsFromConfigs(configs: PlanetSpawnConfig[]): void {
    for (const { name, x, y } of configs) {
      this.registerPlanetByName(name, x, y);
    }
  }

  registerPlanet(def: PlanetDefinition, x: number, y: number): void {
    const controller = new PlanetController(
      x,
      y,
      this.playerShip,
      this.inputManager,
      this.camera,
      def,
      this.waveSpawner
    );
    this.planets.add(controller);
  }

  registerPlanetByName(name: string, x: number, y: number): void {
    const controller = PlanetFactory.createPlanetByName(
      name,
      x,
      y,
      this.playerShip,
      this.inputManager,
      this.camera,
      this.waveSpawner
    );
    this.planets.add(controller);
  }

  public getPlanets(): PlanetController[] {
    return Array.from(this.planets);
  }

  clear(): void {
    this.planets.clear();
  }

  update(dt: number): void {
    for (const planet of this.planets) {
      planet.update(dt);
    }
  }

  /** Renders to the internally held canvas context on the specified layer */
  render(dt: number): void {
    for (const planet of this.planets) {
      planet.render(this.ctx, this.overlayCtx, this.dialogueCtx);
    }
  }
}
