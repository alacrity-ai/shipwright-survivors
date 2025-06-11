import type { DialogueScript } from './interfaces/DialogueScript';
import type { DialogueMode } from './interfaces/DialogueMode';

import { DialogueOrchestrator } from './DialogueOrchestrator';
import { AsyncDialogueManager } from './AsyncDialogueManager';
import { DialogueOrchestratorFactory } from './factories/DialogueOrchestratorFactory';
import { speakerVoiceRegistry } from './registry/SpeakerVoiceRegistry';
import { getTextBoxLayout } from './utils/getTextBoxLayout';

const POST_LINE_DELAY_MS = 800;

export class DialogueQueueManager {
  private currentScript: DialogueScript | null = null;
  private currentIndex = 0;
  private isActive = false;
  private isBlocked = false;
  private pauseTimerMs: number | null = null;
  private postLineDelay = 0;
  private pendingCommand: Promise<void> | null = null;

  private activeSpeakerId: string | null = null;
  private activeSpeakerOptions: {
    mode?: DialogueMode;
    side?: 'left' | 'right';
    textColor?: string;
    font?: string;
    pitchMod?: number;
  } = {};

  private readonly asyncManager: AsyncDialogueManager;

  constructor(
    private readonly orchestrator: DialogueOrchestrator
  ) {
    this.asyncManager = new AsyncDialogueManager(() => DialogueOrchestratorFactory.create());
  }

  public startScript(script: DialogueScript): void {
    this.currentScript = script;
    this.currentIndex = 0;
    this.postLineDelay = 0;
    this.isActive = true;
    this.isBlocked = false;
    this.pendingCommand = null;
    this.advance();
  }

  private advance(): void {
    if (!this.currentScript || this.currentIndex >= this.currentScript.events.length) {
      this.clear();
      return;
    }

    const event = this.currentScript.events[this.currentIndex];
    this.currentIndex++;

    switch (event.type) {
      case 'line': {
        this.orchestrator.setVisualsVisible(true);
        this.isBlocked = true;

        const defaultMode = this.currentScript.defaultMode ?? 'inPerson';
        const lineMode = event.options?.mode ?? this.activeSpeakerOptions.mode ?? defaultMode;
        const side = event.options?.side ?? this.activeSpeakerOptions.side ?? 'left';

        const speakerId = event.speakerId ?? this.activeSpeakerId;
        if (!speakerId) {
          console.warn('No speaker defined for line event');
          this.advance();
          return;
        }

        const textColor = event.options?.textColor ?? this.activeSpeakerOptions.textColor;
        const fontOverride = event.options?.font ?? this.activeSpeakerOptions.font;

        const { textBoxRect, position, font } = getTextBoxLayout({
          mode: lineMode,
          side,
          fontOverride,
        });

        this.orchestrator.startDialogue({
          speakerId,
          text: event.text,
          textColor,
          font,
          textBoxRect,
          textBoxAlpha: event.options?.textBoxAlpha ?? 0.8,
          position,
          mode: lineMode,
          side,
          textSpeed: speakerVoiceRegistry.getProfile(speakerId)?.textSpeed,
        });

        return;
      }

      case 'pause': {
        this.isBlocked = true;
        this.pauseTimerMs = event.durationMs;
        return;
      }

      case 'command': {
        this.isBlocked = true;
        const result = event.run();
        if (result instanceof Promise) {
          this.pendingCommand = result.then(() => {
            this.isBlocked = false;
            this.pendingCommand = null;
          });
        } else {
          this.isBlocked = false;
        }
        return;
      }

      case 'async': {
        this.asyncManager.startAsync(event.dialogue, () => !this.isRunning());
        this.advance();
        return;
      }

      case 'hideUI': {
        this.orchestrator.setVisualsVisible(false);
        this.advance();
        return;
      }

      case 'showUI': {
        this.orchestrator.setVisualsVisible(true);
        this.advance();
        return;
      }

      case 'endIf': {
        if (event.condition()) {
          this.clear();
        } else {
          this.advance();
        }
        return;
      }

      case 'changespeaker': {
        this.activeSpeakerId = event.speakerId;
        this.activeSpeakerOptions = event.options ?? {};
        this.advance();
        return;
      }

      default: {
        console.warn(`Unknown dialogue event type: ${(event as any).type}`);
        this.advance();
        return;
      }
    }
  }

  public update(dt: number): void {
    if (!this.isActive) return;

    this.asyncManager.update(dt);
    this.orchestrator.update(dt);

    if (this.pauseTimerMs !== null) {
      this.pauseTimerMs -= dt * 1000;
      if (this.pauseTimerMs <= 0) {
        this.pauseTimerMs = null;
        this.isBlocked = false;
        this.postLineDelay = POST_LINE_DELAY_MS;
      }
      return;
    }

    if (this.postLineDelay > 0) {
      this.postLineDelay -= dt * 1000;
      return;
    }

    if (this.pendingCommand) return;

    if (this.isBlocked) {
      if (this.orchestrator.isFinished()) {
        this.isBlocked = false;
        this.postLineDelay = POST_LINE_DELAY_MS;
      }
      return;
    }

    this.advance();
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive) return;
    this.orchestrator.render(ctx);
    this.asyncManager.render(ctx);
  }

  public skipOrAdvance(): void {
    if (!this.isActive) return;

    if (!this.orchestrator.isFinished()) {
      this.orchestrator.skipToEnd?.();
    } else if (!this.pendingCommand && !this.isBlocked && this.postLineDelay <= 0) {
      this.advance();
    }
  }

  public isRunning(): boolean {
    return this.isActive;
  }

  public clear(): void {
    this.currentScript = null;
    this.currentIndex = 0;
    this.postLineDelay = 0;
    this.isActive = false;
    this.isBlocked = false;
    this.pendingCommand = null;
    this.orchestrator.clear();
    this.asyncManager.clearAll();
  }

  public destroy(): void {
    this.clear();
  }
}
