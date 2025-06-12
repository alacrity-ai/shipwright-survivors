// src/systems/dialogue/DialogueOrchestrator.ts

import type { DialogueLine } from '@/systems/dialogue/interfaces/DialogueLine';
import type { BlipTimelineEntry } from '@/systems/dialogue/interfaces/BlipTimelineEntry';

import { generateBlipTimeline } from '@/systems/dialogue/utils/generateBlipTimeline';
import { getTextBoxLayout } from '@/systems/dialogue/utils/getTextBoxLayout';

import { GlobalEventBus } from '@/core/EventBus';

import { PortraitRenderer } from '@/systems/dialogue/renderers/PortraitRenderer';
import { TextboxRenderer } from '@/systems/dialogue/renderers/TextboxRenderer';
import { RollingTextRenderer } from '@/systems/dialogue/renderers/RollingTextRenderer';
import { BlipAudioSynchronizer } from '@/systems/dialogue/audio/BlipAudioSynchronizer';
import { SpeakerVoiceRegistry } from '@/systems/dialogue/registry/SpeakerVoiceRegistry';

export class DialogueOrchestrator {
  private activeLine: DialogueLine | null = null;
  private blipTimeline: BlipTimelineEntry[] = [];
  private elapsed = 0;
  private finished = false;
  private visualsVisible = true;
  private forceRightSide: boolean = false;

  private readonly onMenuOpened = ({ id }: { id: string }) => {
    if (id === 'blockDropDecisionMenu') this.forceRightSide = true;
  };

  private readonly onMenuClosed = ({ id }: { id: string }) => {
    if (id === 'blockDropDecisionMenu') this.forceRightSide = false;
  };

  constructor(
    private readonly portraitRenderer: PortraitRenderer,
    private readonly textboxRenderer: TextboxRenderer,
    private readonly textRenderer: RollingTextRenderer,
    private readonly audioSynchronizer: BlipAudioSynchronizer,
    private readonly speakerRegistry: SpeakerVoiceRegistry
  ) {
    GlobalEventBus.on('menu:opened', this.onMenuOpened);
    GlobalEventBus.on('menu:closed', this.onMenuClosed);
  }

  public destroy(): void {
    GlobalEventBus.off('menu:opened', this.onMenuOpened);
    GlobalEventBus.off('menu:closed', this.onMenuClosed);
  }

  public startDialogue(line: DialogueLine): void {
    const speaker = this.speakerRegistry.getProfile(line.speakerId);
    if (!speaker) {
      console.warn(`Unknown speaker ID: ${line.speakerId}`);
      return;
    }

    this.activeLine = line;
    this.elapsed = 0;
    this.finished = false;

    this.textRenderer.start(line);
    this.blipTimeline = generateBlipTimeline(line.text, speaker);
    this.audioSynchronizer.start(this.blipTimeline);
  }

  public update(dt: number): void {
    if (!this.activeLine || this.finished) return;

    this.elapsed += dt;
    this.textRenderer.update(dt);
    this.audioSynchronizer.update(this.elapsed);

    if (this.textRenderer.isFinished()) {
      this.finished = true;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.visualsVisible || !this.activeLine) return;

    const line = this.activeLine;
    const speaker = this.speakerRegistry.getProfile(line.speakerId);
    if (!speaker) return;

    const layout = getTextBoxLayout({
      mode: line.mode,
      side: this.forceRightSide ? 'right' : line.side,
      fontOverride: line.font,
    });

    this.portraitRenderer.render(ctx, layout.position, line, speaker);
    this.textboxRenderer.render(ctx, layout.textBoxRect, line, speaker);
    this.textRenderer.render(ctx, layout.textBoxRect, layout.font, line);
  }

  public skipToEnd(): void {
    if (!this.activeLine || this.finished) return;

    this.textRenderer.skipToEnd?.();
    this.audioSynchronizer.skipToEnd?.();
    this.finished = true;
  }

  public isFinished(): boolean {
    return this.finished;
  }

  public clear(): void {
    this.activeLine = null;
    this.elapsed = 0;
    this.finished = false;
    this.textRenderer.clear();
    this.audioSynchronizer.clear();
  }

  public setVisualsVisible(visible: boolean): void {
    this.visualsVisible = visible;
  }

  public getVisualsVisible(): boolean {
    return this.visualsVisible;
  }
}
