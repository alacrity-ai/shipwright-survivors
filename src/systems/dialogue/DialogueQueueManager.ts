// src/systems/dialogue/DialogueQueueManager.ts

import type { DialogueScript } from './interfaces/DialogueScript';
import type { DialogueMode } from './interfaces/DialogueMode';

import { getUniformScaleFactor } from '@/config/view';
import { DialogueOrchestrator } from './DialogueOrchestrator';
import { speakerVoiceRegistry } from './registry/SpeakerVoiceRegistry';

const POST_LINE_DELAY_MS = 800;

const INPERSON_TEXTBOXRECT = { x: 320, y: 120, width: 520, height: 140 };
const INPERSON_PORTRAIT_POSITION = { x: 80, y: 420 };
const INPERSON_FONT = '24px monospace';

const TRANSMISSION_TEXTBOXRECT = { x: 180, y: 20, width: 500, height: 120 };
const TRANSMISSION_TEXTBOXRECT_RIGHT = { x: 590, y: 20, width: 500, height: 120 };
const TRANSMISSION_PORTRAIT_POSITION_RIGHT = { x: 1130, y: 20 };
const TRANSMISSION_PORTRAIT_POSITION = { x: 20, y: 20 };
const TRANSMISSION_FONT = '20px monospace';

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
        const lineMode = event.options?.mode ?? this.activeSpeakerOptions.mode ?? defaultMode;
        const side = event.options?.side ?? this.activeSpeakerOptions.side ?? 'left';

        const isInPerson = lineMode === 'inPerson';
        const isRightSide = side === 'right';

        const speakerId = event.speakerId ?? this.activeSpeakerId;
        if (!speakerId) {
          console.warn('No speaker defined for line event');
          this.advance();
          return;
        }

        const uiScale = getUniformScaleFactor();

        const textBoxRect = isInPerson
          ? {
              x: 320 * uiScale,
              y: 120 * uiScale,
              width: 520 * uiScale,
              height: 140 * uiScale,
            }
          : isRightSide
            ? {
                x: 590 * uiScale,
                y: 20 * uiScale,
                width: 500 * uiScale,
                height: 120 * uiScale,
              }
            : {
                x: 180 * uiScale,
                y: 20 * uiScale,
                width: 500 * uiScale,
                height: 120 * uiScale,
              };

        const position = isInPerson
          ? { x: 80 * uiScale, y: 420 * uiScale }
          : isRightSide
            ? { x: 1130 * uiScale, y: 20 * uiScale }
            : { x: 20 * uiScale, y: 20 * uiScale };

        const baseFontSize = isInPerson ? 24 : 20;
        const font =
          event.options?.font ??
          this.activeSpeakerOptions.font ??
          `${Math.round(baseFontSize * uiScale)}px monospace`;

        const textColor =
          event.options?.textColor ??
          this.activeSpeakerOptions.textColor;

        this.orchestrator.startDialogue({
          speakerId,
          text: event.text,
          textColor,
          font,
          textBoxRect,
          textBoxAlpha: event.options?.textBoxAlpha ?? 0.8,
          position,
          mode: lineMode,
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

      case 'hideUI': {
        this.orchestrator.setVisualsVisible(false);
        this.advance(); // immediately move to next event
        return;
      }

      case 'showUI': {
        this.orchestrator.setVisualsVisible(true);
        this.advance(); // immediately move to next event
        return;
      }

      case 'endIf': {
        if (event.condition()) {
          this.clear(); // End the dialogue immediately
        } else {
          this.advance(); // Continue to next event
        }
        return;
      }

      case 'changespeaker': {
        this.activeSpeakerId = event.speakerId;
        this.activeSpeakerOptions = event.options ?? {};
        this.advance(); // immediately proceed to next event
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
