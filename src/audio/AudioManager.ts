// src/audio/AudioManager.ts

import { getAssetPath } from '@/shared/assetHelpers';

export class AudioManager {
  private context: AudioContext;
  private bufferCache = new Map<string, AudioBuffer>();
  private currentlyPlaying = new Set<string>();

  constructor() {
    this.context = new AudioContext();
  }

  public async play(file: string, options?: { pitch?: number }): Promise<void> {
    if (this.currentlyPlaying.has(file)) {
      return; // prevent overlapping identical sounds
    }

    let buffer = this.bufferCache.get(file);
    if (!buffer) {
      try {
        const response = await fetch(getAssetPath(file));
        const arrayBuffer = await response.arrayBuffer();
        buffer = await this.context.decodeAudioData(arrayBuffer);
        this.bufferCache.set(file, buffer);
      } catch (err) {
        console.warn(`Failed to load audio file: ${file}`, err);
        return;
      }
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = options?.pitch ?? 1.0;
    source.connect(this.context.destination);

    this.currentlyPlaying.add(file);

    source.onended = () => {
      this.currentlyPlaying.delete(file);
    };

    source.start(0);
  }

  public unlock(): void {
    // Call this on a user gesture (e.g. mousedown) to resume context
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  public clearCache(): void {
    this.bufferCache.clear();
  }
}
