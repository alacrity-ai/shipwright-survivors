// src/game/planets/PlanetSystem.ts

import type { Ship } from '@/game/ship/Ship';
import type { InputManager } from '@/core/InputManager';
import type { Camera } from '@/core/Camera';
import type { PlanetDefinition } from './interfaces/PlanetDefinition';
import type { CanvasManager } from '@/core/CanvasManager';
import type { PlanetSpawnConfig } from '@/game/missions/types/MissionDefinition';
import type { WaveOrchestrator } from '@/game/waves/orchestrator/WaveOrchestrator';
import type { UnifiedSceneRendererGL } from '@/rendering/unified/UnifiedSceneRendererGL';
import type { PlanetInstance } from '@/rendering/unified/passes/PlanetPass';

import { PlanetController } from './PlanetController';
import { PlanetFactory } from './PlanetFactory';
import { PlanetRegistry } from './PlanetRegistry';

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
    private readonly waveOrchestrator: WaveOrchestrator,
    private readonly unifiedRenderer: UnifiedSceneRendererGL
  ) {
    this.ctx = canvasManager.getContext('background');
    this.overlayCtx = canvasManager.getContext('ui');
    this.dialogueCtx = canvasManager.getContext('dialogue');
    this.unifiedRenderer = unifiedRenderer;
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
      this.waveOrchestrator
    );
    this.planets.add(controller);

    // Add to unified renderer
    this.unifiedRenderer.addPlanet(
      {
        name: def.name,
        x,
        y,
      },
      def.scale ?? 1,
      def.imagePath
    );
  }

  registerPlanetByName(name: string, x: number, y: number): void {
    const controller = PlanetFactory.createPlanetByName(
      name,
      x,
      y,
      this.playerShip,
      this.inputManager,
      this.camera,
      this.waveOrchestrator
    );
    this.planets.add(controller);

    const def = PlanetRegistry.getPlanetByName(name);

    // Add to unified renderer
    this.unifiedRenderer.addPlanet(
      {
        name,
        x,
        y,
      },
      def.scale ?? 1,
      def.imagePath
    );
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

  // Actual planet rendering now moved to UnifiedSceneRendererGL
  // This will render only overlay information (e.g. planet name, interaction range indicator)
  /** Renders to the internally held canvas context on the specified layer */
  render(dt: number): void {
    for (const planet of this.planets) {
      planet.render(this.ctx, this.overlayCtx, this.dialogueCtx);
    }
  }
}
