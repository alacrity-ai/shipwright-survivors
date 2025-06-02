// src/systems/dialogue/audio/BlipAudioSynchronizer.ts

import type { BlipTimelineEntry } from '@/systems/dialogue/interfaces/BlipTimelineEntry';

export class BlipAudioSynchronizer {
  private timeline: BlipTimelineEntry[] = [];
  private currentIndex = 0;

  constructor(
    private readonly playSound: (file: string, options?: { pitch?: number }) => void
  ) {}

  public start(timeline: BlipTimelineEntry[]): void {
    this.timeline = timeline;
    this.currentIndex = 0;
  }

  public update(elapsedTime: number): void {
    while (
      this.currentIndex < this.timeline.length &&
      this.timeline[this.currentIndex].timestamp <= elapsedTime
    ) {
      const blip = this.timeline[this.currentIndex];
      this.playSound(blip.audioFile, { pitch: blip.pitch });
      this.currentIndex++;
    }
  }

  public skipToEnd(): void {
    // Play all remaining blips immediately
    for (; this.currentIndex < this.timeline.length; this.currentIndex++) {
      const blip = this.timeline[this.currentIndex];
      this.playSound(blip.audioFile, { pitch: blip.pitch });
    }
  }

  public clear(): void {
    this.timeline = [];
    this.currentIndex = 0;
  }
}
