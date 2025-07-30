// src/game/planets/PlanetSystem.ts

import type { Ship } from '@/game/ship/Ship';
import type { InputManager } from '@/core/InputManager';
import type { Camera } from '@/core/Camera';
import type { PlanetDefinition } from './interfaces/PlanetDefinition';
import type { CanvasManager } from '@/core/CanvasManager';
import type { PlanetSpawnConfig } from '@/game/missions/types/MissionDefinition';
import type { WaveOrchestrator } from '@/game/waves/orchestrator/WaveOrchestrator';
import type { UnifiedSceneRendererGL } from '@/rendering/unified/UnifiedSceneRendererGL';
import type { MissionDialogueManager } from '@/systems/dialogue/MissionDialogueManager';

import { GlobalEventBus } from '@/core/EventBus';

import { PlanetController } from './PlanetController';
import { PlanetFactory } from './PlanetFactory';
import { PlanetRegistry } from './PlanetRegistry';

export class PlanetSystem {
  private readonly planets: Set<PlanetController> = new Set();
  private readonly ctx: CanvasRenderingContext2D;
  private readonly overlayCtx: CanvasRenderingContext2D;
  private readonly dialogueCtx: CanvasRenderingContext2D;

  private enabled: boolean = true;

  // === Stable listener references ===
  private readonly handleDisable = () => { this.enabled = false };
  private readonly handleEnable = () => { this.enabled = true };

  constructor(
    private readonly playerShip: Ship | null,
    private readonly inputManager: InputManager,
    private readonly camera: Camera,
    private readonly canvasManager: CanvasManager,
    private readonly waveOrchestrator: WaveOrchestrator,
    private readonly unifiedRenderer: UnifiedSceneRendererGL,
    private readonly missionDialogueManager: MissionDialogueManager
  ) {
    this.ctx = canvasManager.getContext('overlay');
    this.overlayCtx = canvasManager.getContext('overlay');
    this.dialogueCtx = canvasManager.getContext('overlay');

    // Register stable event listeners
    GlobalEventBus.on('planets:disable', this.handleDisable);
    GlobalEventBus.on('planets:enable', this.handleEnable);
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
      this.waveOrchestrator,
      this.missionDialogueManager
    );
    this.planets.add(controller);

    this.unifiedRenderer.addPlanet(
      { name: def.name, x, y },
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
      this.waveOrchestrator,
      this.missionDialogueManager
    );
    this.planets.add(controller);

    const def = PlanetRegistry.getPlanetByName(name);

    this.unifiedRenderer.addPlanet(
      { name, x, y },
      def.scale ?? 1,
      def.imagePath
    );
  }

  public getPlanets(): PlanetController[] {
    return Array.from(this.planets);
  }

  clear(): void {
    this.planets.clear();

    // Unregister stable event listeners
    GlobalEventBus.off('planets:disable', this.handleDisable);
    GlobalEventBus.off('planets:enable', this.handleEnable);
  }

  update(dt: number): void {
    if (!this.enabled) return;
    for (const planet of this.planets) {
      planet.update(dt);
    }
  }

  render(dt: number): void {
    if (!this.enabled) return;
    for (const planet of this.planets) {
      planet.render(this.ctx, this.overlayCtx, this.dialogueCtx);
    }
  }
}
