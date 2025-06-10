// src/systems/dialogue/MissionDialogueManager.ts

import type { IUpdatable, IRenderable } from '@/core/interfaces/types';
import type { InputManager } from '@/core/InputManager';
import type { CanvasManager } from '@/core/CanvasManager';
import type { WaveSpawner } from '@/systems/wavespawner/WaveSpawner';
import type { Ship } from '@/game/ship/Ship';

import { missionLoader } from '@/game/missions/MissionLoader';
import { DialogueQueueManagerFactory } from './factories/DialogueQueueManagerFactory';
import { getDialogueScript } from './registry/DialogueScriptRegistry';
import type { DialogueContext } from '@/systems/dialogue/interfaces/DialogueContext';

export class MissionDialogueManager implements IUpdatable, IRenderable {
  private readonly dialogueQueueManager = DialogueQueueManagerFactory.create();
  private readonly scriptQueue: string[] = [];

  constructor(
    private readonly inputManager: InputManager,
    private readonly canvasManager: CanvasManager,
    private readonly waveSpawner: WaveSpawner,
    private readonly playerShip: Ship
  ) {}

  public initialize(): void {
    this.enqueueInitialDialogues();
    this.tryStartNextScript();
  }

  private enqueueInitialDialogues(): void {
    const dialogueKey = missionLoader.getMissionDialogue();
    if (dialogueKey) {
      const dialogueScript = getDialogueScript(dialogueKey, this.getDialogueContext());
      if (dialogueScript) {
        this.scriptQueue.push(dialogueKey);
      }
    }
  }

  private getDialogueContext(): DialogueContext {
    return {
      inputManager: this.inputManager,
      playerShip: this.playerShip,
      waveSpawner: this.waveSpawner,
      // Extend here as more systems are integrated
    };
  }

  private tryStartNextScript(): void {
    if (this.dialogueQueueManager.isRunning()) return;
    if (this.scriptQueue.length === 0) return;

    const nextId = this.scriptQueue.shift()!;
    const script = getDialogueScript(nextId, this.getDialogueContext());
    if (script) {
      this.dialogueQueueManager.startScript(script);
    }
  }

  public update(dt: number): void {
    this.dialogueQueueManager.update(dt);

    if (!this.dialogueQueueManager.isRunning()) {
      this.tryStartNextScript();
    }
  }

  public render(): void {
    const ctx = this.canvasManager.getContext('dialogue');
    this.dialogueQueueManager.render(ctx);
  }
}
