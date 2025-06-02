// src/systems/dialogue/DialogueOrchestrator.ts

import type { DialogueLine } from '@/systems/dialogue/interfaces/DialogueLine';
import type { BlipTimelineEntry } from '@/systems/dialogue/interfaces/BlipTimelineEntry';

import { generateBlipTimeline } from '@/systems/dialogue/utils/generateBlipTimeline';
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

  constructor(
    private readonly portraitRenderer: PortraitRenderer,
    private readonly textboxRenderer: TextboxRenderer,
    private readonly textRenderer: RollingTextRenderer,
    private readonly audioSynchronizer: BlipAudioSynchronizer,
    private readonly speakerRegistry: SpeakerVoiceRegistry
  ) {}

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
    if (!this.activeLine) return;

    const line = this.activeLine;
    const speaker = this.speakerRegistry.getProfile(line.speakerId);
    if (!speaker) return;

    this.portraitRenderer.render(ctx, line, speaker);
    this.textboxRenderer.render(ctx, line, speaker);
    this.textRenderer.render(ctx, line);
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
}
