// src/game/planets/PlanetController.ts

import { PlanetOverlayRenderer } from '@/game/planets/PlanetOverlayRenderer';

import { DialogueQueueManagerFactory } from '@/systems/dialogue/factories/DialogueQueueManagerFactory';
import { getDialogueScript } from '@/systems/dialogue/registry/DialogueScriptRegistry';
import { openTradepostMenu } from '@/core/interfaces/events/TradePostReporter';

import { flags } from '@/game/player/PlayerFlagManager';

import type { DialogueQueueManager } from '@/systems/dialogue/DialogueQueueManager';

import type { WaveOrchestrator } from '@/game/waves/orchestrator/WaveOrchestrator';
import type { PlanetDefinition } from './interfaces/PlanetDefinition';
import type { Ship } from '@/game/ship/Ship';
import type { InputManager } from '@/core/InputManager';
import type { Camera } from '@/core/Camera';


export class PlanetController {
  private readonly renderer: PlanetOverlayRenderer;
  private readonly dialogueQueueManager: DialogueQueueManager

  private isInteracting = false;

  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly playerShip: Ship,
    private readonly inputManager: InputManager,
    private readonly camera: Camera,
    private readonly definition: PlanetDefinition,
    private readonly waveOrchestrator: WaveOrchestrator
  ) {
    // Initialize renderer (Only now renders overlay information)
    this.renderer = new PlanetOverlayRenderer(definition.name);
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
    if (inInteractionRange && (this.inputManager.wasKeyJustPressed('KeyC') || this.inputManager.wasGamepadAliasJustPressed('A')) && !this.isInteracting) {
      // TODO : Perhaps open tradepost through dialogue and remove this priority system where we directly open menu
      if (this.definition.tradePostId) {
        this.isInteracting = true;
        openTradepostMenu(this.definition.tradePostId);
        return;
      } else {
        this.isInteracting = true;
        const script = getDialogueScript(this.definition.interactionDialogueId, { 
          inputManager: this.inputManager, 
          playerShip: this.playerShip, 
          waveOrchestrator: this.waveOrchestrator });
        if (script) {
          this.dialogueQueueManager.startScript(script);
        }
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
    
    if (!flags.has('mission.intro-briefing.complete')) return;

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

  getScale(): number {
    return this.definition.scale;
  }
}
