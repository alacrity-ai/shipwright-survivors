// src/systems/dialogue/DialogueQueueManager.ts

import type { DialogueScript } from './interfaces/DialogueScript';

import { DialogueOrchestrator } from './DialogueOrchestrator';

const POST_LINE_DELAY_MS = 500;

const INPERSON_TEXTBOXRECT = { x: 320, y: 120, width: 520, height: 100 };
const INPERSON_PORTRAIT_POSITION = { x: 80, y: 420 };
const TRANSMISSION_TEXTBOXRECT = { x: 180, y: 20, width: 440, height: 100 };
const TRANSMISSION_PORTRAIT_POSITION = { x: 20, y: 20 };

export class DialogueQueueManager {
  private currentScript: DialogueScript | null = null;
  private currentIndex = 0;
  private isActive = false;
  private isBlocked = false;
  private pauseTimerMs: number | null = null;
  private postLineDelay = 0;
  private pendingCommand: Promise<void> | null = null;

  constructor(
    private readonly orchestrator: DialogueOrchestrator,
  ) {}

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
        this.isBlocked = true;

        const defaultMode = this.currentScript.defaultMode ?? 'inPerson';
        const lineMode = event.options?.mode ?? defaultMode;

        this.orchestrator.startDialogue({
          speakerId: event.speakerId,
          text: event.text,
          textColor: event.options?.textColor,
          font: event.options?.font,
          textBoxRect: lineMode === 'inPerson' ? INPERSON_TEXTBOXRECT : TRANSMISSION_TEXTBOXRECT,
          position: lineMode === 'inPerson' ? INPERSON_PORTRAIT_POSITION : TRANSMISSION_PORTRAIT_POSITION,
          mode: lineMode,
        });

        return; // Prevents fall-through to next event (e.g. command)
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
    }
  }

  public update(dt: number): void {
    if (!this.isActive) return;

    this.orchestrator.update(dt);

    // === Frame-driven pause timer ===
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

    if (this.pendingCommand) {
      return;
    }

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
    if (this.isActive) {
      this.orchestrator.render(ctx);
    }
  }

  public skipOrAdvance(): void {
    if (!this.isActive) return;

    if (!this.orchestrator.isFinished()) {
      this.orchestrator.skipToEnd?.(); // Fast-forward current line
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
  }
}
