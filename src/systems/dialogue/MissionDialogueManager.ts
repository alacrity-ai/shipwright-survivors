import type { IUpdatable, IRenderable } from '@/core/interfaces/types';
import type { InputManager } from '@/core/InputManager';
import type { CanvasManager } from '@/core/CanvasManager';

import { DialogueQueueManagerFactory } from './factories/DialogueQueueManagerFactory';
import { getDialogueScript } from './registry/DialogueScriptRegistry';
import { flags } from '@/game/player/PlayerFlagManager';

export class MissionDialogueManager implements IUpdatable, IRenderable {
  private readonly dialogueQueueManager = DialogueQueueManagerFactory.create();
  private readonly scriptQueue: string[] = [];

  constructor(
    private readonly inputManager: InputManager,
    private readonly canvasManager: CanvasManager
  ) {}

  public initialize(): void {
    this.enqueueInitialDialogues();
    this.tryStartNextScript();
  }

  private enqueueInitialDialogues(): void {
    if (!flags.has('mission.intro-briefing.complete')) {
      this.scriptQueue.push('intro-briefing');
    }
    // if (!flags.has('mission.vlox-attack.complete')) {
    //   this.scriptQueue.push('vlox-attack');
    // }
    // if (!flags.has('mission.space-station-greeting.complete')) {
    //   this.scriptQueue.push('space-station-greeting');
    // }
  }

  private tryStartNextScript(): void {
    if (this.dialogueQueueManager.isRunning()) return;
    if (this.scriptQueue.length === 0) return;

    const nextId = this.scriptQueue.shift()!;
    const script = getDialogueScript(nextId, this.inputManager);
    if (script) {
      this.dialogueQueueManager.startScript(script);
    }
  }

  public update(dt: number): void {
    this.dialogueQueueManager.update(dt);

    // Don't allow skipping dialogue in missions
    // if (this.inputManager.wasMouseClicked()) {
    //   this.dialogueQueueManager.skipOrAdvance();
    // }

    if (!this.dialogueQueueManager.isRunning()) {
      this.tryStartNextScript();
    }
  }

  public render(): void {
    const ctx = this.canvasManager.getContext('dialogue');
    this.dialogueQueueManager.render(ctx);
  }
}
