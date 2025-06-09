// src/game/planets/PlanetController.ts

import { PlanetRenderer } from './PlanetRenderer';

import { DialogueQueueManagerFactory } from '@/systems/dialogue/factories/DialogueQueueManagerFactory';
import { getDialogueScript } from '@/systems/dialogue/registry/DialogueScriptRegistry';
import { CanvasManager } from '@/core/CanvasManager';

import type { DialogueQueueManager } from '@/systems/dialogue/DialogueQueueManager';

import type { WaveSpawner } from '@/systems/wavespawner/WaveSpawner';
import type { PlanetDefinition } from './interfaces/PlanetDefinition';
import type { Ship } from '@/game/ship/Ship';
import type { InputManager } from '@/core/InputManager';
import type { Camera } from '@/core/Camera';


export class PlanetController {
  private readonly renderer: PlanetRenderer;
  private readonly dialogueQueueManager: DialogueQueueManager

  private isInteracting = false;

  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly playerShip: Ship,
    private readonly inputManager: InputManager,
    private readonly camera: Camera,
    private readonly definition: PlanetDefinition,
    private readonly waveSpawner: WaveSpawner
  ) {
    const gl = CanvasManager.getInstance().getWebGLContext('backgroundgl');
    this.renderer = new PlanetRenderer(gl, definition.imagePath, definition.scale, definition.name);
    this.dialogueQueueManager = DialogueQueueManagerFactory.create();
  }

  /** Precomputes proximity ranges */
  private calculateRanges(): {
    inDrawingRange: boolean;
    inTransmissionRange: boolean;
    inInteractionRange: boolean;
    dx: number;
    dy: number;
  } {
    const px = this.playerShip.getTransform().position.x;
    const py = this.playerShip.getTransform().position.y;

    const dx = this.x - px;
    const dy = this.y - py;
    const distSq = dx * dx + dy * dy;

    const baseRadius = this.definition.scale * 1000 + 1000;
    const drawRadiusSq = baseRadius * baseRadius;
    const transmissionRadiusSq = (baseRadius * 0.5) ** 2;
    const interactionRadiusSq = (baseRadius * 0.25) ** 2;

    return {
      inDrawingRange: distSq <= drawRadiusSq,
      inTransmissionRange: distSq <= transmissionRadiusSq,
      inInteractionRange: distSq <= interactionRadiusSq,
      dx,
      dy,
    };
  }

  update(dt: number): void {
    // In future: interaction logic, audio triggers, etc.
    const {
      inTransmissionRange,
      inInteractionRange
    } = this.calculateRanges();

    // update planet atmosphere animation
    this.renderer.update(dt);

    // Example: later trigger dialogue or highlight UI
    if (inInteractionRange && this.inputManager.wasKeyJustPressed('KeyC') && !this.isInteracting) {
      this.isInteracting = true;
      const script = getDialogueScript(this.definition.interactionDialogueId, { 
        inputManager: this.inputManager, 
        playerShip: this.playerShip, 
        waveSpawner: this.waveSpawner });
      if (script) {
        this.dialogueQueueManager.startScript(script);
      }
    }
    if (this.dialogueQueueManager.isRunning()) {
      this.dialogueQueueManager.update(dt);
      if (this.inputManager.wasMouseClicked()) {
        this.dialogueQueueManager.skipOrAdvance();
      }
    } else {
      this.isInteracting = false;
    }
  }

  render(
    ctx: CanvasRenderingContext2D, 
    overlayCtx: CanvasRenderingContext2D, 
    dialogueCtx: CanvasRenderingContext2D): void {
    const {
      inDrawingRange,
      inTransmissionRange,
      inInteractionRange,
      dx,
      dy
    } = this.calculateRanges();

    if (inDrawingRange) {
      this.renderer.render(
        overlayCtx,
        this.x,
        this.y,
        this.camera,
        inInteractionRange,
        this.isInteracting
      );
    }

    this.dialogueQueueManager.render(dialogueCtx);
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
