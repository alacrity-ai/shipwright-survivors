// src/game/planets/PlanetController.ts

import { PlanetOverlayRenderer } from '@/game/planets/PlanetOverlayRenderer';

import { DialogueQueueManagerFactory } from '@/systems/dialogue/factories/DialogueQueueManagerFactory';
import { getDialogueScript } from '@/systems/dialogue/registry/DialogueScriptRegistry';
import { openPlanetInteractionOptions } from '@/core/interfaces/events/PlanetMenusReporter';
import { audioManager } from '@/audio/Audio';

import { allPlanetsDiscoveredInMission } from '@/game/missions/MissionRegistry';
import { reportQuestStepUpdated } from '@/core/interfaces/events/QuestReporter';
import { missionLoader } from '../missions/MissionLoader';
import { flags } from '@/game/player/PlayerFlagManager';

import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';

import type { DialogueQueueManager } from '@/systems/dialogue/DialogueQueueManager';
import type { WaveOrchestrator } from '@/game/waves/orchestrator/WaveOrchestrator';
import type { PlanetDefinition } from './interfaces/PlanetDefinition';
import type { Ship } from '@/game/ship/Ship';
import type { InputManager } from '@/core/InputManager';
import type { Camera } from '@/core/Camera';
import type { FlagKey } from '@/game/player/registry/FlagRegistry';
import type { MissionDialogueManager } from '@/systems/dialogue/MissionDialogueManager';

export class PlanetController {
  private readonly renderer: PlanetOverlayRenderer;
  private readonly dialogueQueueManager: DialogueQueueManager

  private isInteracting = false;

  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly playerShip: Ship | null,
    private readonly inputManager: InputManager,
    private readonly camera: Camera,
    private readonly definition: PlanetDefinition,
    private readonly waveOrchestrator: WaveOrchestrator,
    private readonly missionDialogueManager: MissionDialogueManager,

    private interactionLatched: boolean = false
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
    if (!this.playerShip) return {
      inDrawingRange: false,
      inTransmissionRange: false,
      inInteractionRange: false,
      dx: 0,
      dy: 0,
    };

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

    if (!this.playerShip) return;

    if (inInteractionRange) {
      if (!this.interactionLatched) {
        this.interactionLatched = true;
        GlobalMenuReporter.getInstance().setSpecialBlocker('planet-interaction-overlay');
      }
      if ((this.inputManager.wasKeyJustPressed('KeyC') || this.inputManager.wasGamepadAliasJustPressed('select')) && !this.isInteracting) {
        if (this.definition.tradePostId) {
          this.isInteracting = true;
          audioManager.play('assets/sounds/sfx/ui/activate_01.wav', 'sfx');

          // Flag planet as visited
          const planetNameLowercase = this.definition.name.toLowerCase();
          flags.set(`planet.${planetNameLowercase}.visited` as FlagKey);

          // If all planets are discovered, fire discovered quest event
          const currentMission = missionLoader.getMission();
          if (allPlanetsDiscoveredInMission(currentMission.id)) {
            reportQuestStepUpdated('planetsExplored', true);
          }

          // Fire event to open planet interaction options
          openPlanetInteractionOptions(this.definition);
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
    } else {
      if (this.interactionLatched) {
        this.interactionLatched = false;
        GlobalMenuReporter.getInstance().clearSpecialBlocker('planet-interaction-overlay');
      }
    }
  }

  render(
    ctx: CanvasRenderingContext2D, 
    overlayCtx: CanvasRenderingContext2D, 
    dialogueCtx: CanvasRenderingContext2D): void {
    
    if (!flags.has('mission.intro-briefing.complete')) return;
    if (this.missionDialogueManager.isDialogueVisible()) return;

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

  getName(): string {
    return this.definition.name;
  }

  getScale(): number {
    return this.definition.scale;
  }
}
