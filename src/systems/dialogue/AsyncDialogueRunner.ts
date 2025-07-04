// src/systems/dialogue/AsyncDialogueRunner.ts

import type { DialogueEvent } from '@/systems/dialogue/interfaces/DialogueEvent';
import { DialogueOrchestrator } from '@/systems/dialogue/DialogueOrchestrator';
import { getTextBoxLayout } from '@/systems/dialogue/utils/getTextBoxLayout';
import { speakerVoiceRegistry } from '@/systems/dialogue/registry/SpeakerVoiceRegistry';

import { GlobalEventBus } from '@/core/EventBus';

export class AsyncDialogueRunner {
  private index = 0;
  private isBlocked = false;
  private pauseTimerMs: number | null = null;
  private pendingCommand: Promise<void> | null = null;
  private requestedVisualFocus = false;
  private hasVisualFocus = false;
  private forceRightSide = false;

  private readonly onMenuOpened = ({ id }: { id: string }) => {
    if (id === 'blockDropDecisionMenu') this.forceRightSide = true;
  };

  private readonly onMenuClosed = ({ id }: { id: string }) => {
    if (id === 'blockDropDecisionMenu') this.forceRightSide = false;
  };

  constructor(
    private readonly events: DialogueEvent[],
    private readonly orchestrator: DialogueOrchestrator,
    private readonly shouldInterrupt: () => boolean = () => false
  ) {
    GlobalEventBus.on('menu:opened', this.onMenuOpened);
    GlobalEventBus.on('menu:closed', this.onMenuClosed);
  }

  public destroy(): void {
    GlobalEventBus.off('menu:opened', this.onMenuOpened);
    GlobalEventBus.off('menu:closed', this.onMenuClosed);
    this.orchestrator.destroy(); // Also clean up orchestrator
  }

  update(dt: number): void {
    if (this.shouldInterrupt()) {
      this.clear();
      return;
    }

    this.orchestrator.update(dt);

    if (this.pauseTimerMs !== null) {
      this.pauseTimerMs -= dt * 1000;
      if (this.pauseTimerMs <= 0) {
        this.pauseTimerMs = null;
        this.isBlocked = false;
      }
      return;
    }

    if (this.pendingCommand) return;
    if (this.isBlocked && !this.orchestrator.isFinished()) return;
    if (this.index >= this.events.length) return;

    const event = this.events[this.index++];

    switch (event.type) {
      case 'line': {
        this.requestedVisualFocus = true;

        if (!this.hasVisualFocus) {
          this.index--;
          return;
        }

        this.orchestrator.setVisualsVisible(true);
        this.isBlocked = true;

        const requestedSide = event.options?.side ?? 'left';
        const side = this.forceRightSide ? 'right' : requestedSide;
        const mode = event.options?.mode ?? 'transmission';
        const fontOverride = event.options?.font;

        const { textBoxRect, position, font } = getTextBoxLayout({ mode, side, fontOverride });

        this.orchestrator.startDialogue({
          speakerId: event.speakerId,
          text: event.text,
          textColor: event.options?.textColor,
          font,
          textBoxRect,
          textBoxAlpha: event.options?.textBoxAlpha ?? 0.8,
          position,
          mode,
          side,
          textSpeed: speakerVoiceRegistry.getProfile(event.speakerId)?.textSpeed,
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

      case 'showUI': {
        this.orchestrator.setVisualsVisible(true);
        return;
      }

      case 'hideUI': {
        this.orchestrator.setVisualsVisible(false);
        return;
      }

      case 'endIf': {
        if (event.condition()) {
          this.clear();
        }
        return;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.orchestrator.render(ctx);
  }

  isFinished(): boolean {
    return this.index >= this.events.length && !this.isBlocked;
  }

  wantsVisualFocus(): boolean {
    return this.requestedVisualFocus && !this.hasVisualFocus;
  }

  grantVisualFocus(): void {
    this.hasVisualFocus = true;
  }

  clear(): void {
    this.index = this.events.length;
    this.orchestrator.clear();
  }

  skipToEnd(): void {
    this.orchestrator.skipToEnd?.();
  }
}
