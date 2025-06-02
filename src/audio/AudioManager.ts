// src/audio/AudioManager.ts

import { getAssetPath } from '@/shared/assetHelpers';

type AudioChannel = 'music' | 'sfx' | 'dialogue';

export interface MusicTrack {
  file: string;
  loopStartMs?: number;
}

export class AudioManager {
  private context: AudioContext;
  private masterGain: GainNode;
  private channelGains: Record<AudioChannel, GainNode>;
  private bufferCache = new Map<string, AudioBuffer>();
  private currentlyPlaying = new Set<string>();
  private currentMusicSource: AudioBufferSourceNode | null = null;
  private currentMusicFile: string | null = null;
  private isMusicLooping = false;

  constructor() {
    this.context = new AudioContext();

    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);

    this.channelGains = {
      music: this.context.createGain(),
      sfx: this.context.createGain(),
      dialogue: this.context.createGain(),
    };

    // Connect each channel to master
    for (const gain of Object.values(this.channelGains)) {
      gain.connect(this.masterGain);
    }
  }

  public async play(file: string, channel: AudioChannel, options?: { pitch?: number }): Promise<void> {
    if (this.currentlyPlaying.has(file)) return;

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

    source.connect(this.channelGains[channel]);
    this.currentlyPlaying.add(file);

    source.onended = () => {
      this.currentlyPlaying.delete(file);
    };

    source.start(0);
  }

  public setChannelVolume(channel: AudioChannel, volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.channelGains[channel].gain.value = clamped;
  }

  public getChannelVolume(channel: AudioChannel): number {
    return this.channelGains[channel].gain.value;
  }

  public setMasterVolume(volume: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  public getMasterVolume(): number {
    return this.masterGain.gain.value;
  }

  public unlock(): void {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  public clearCache(): void {
    this.bufferCache.clear();
  }

  public async playMusic(track: MusicTrack): Promise<void> {
      const { file, loopStartMs = 0 } = track;

      if (this.currentMusicFile === file && this.isMusicLooping) {
        return; // Already playing and looping this track
      }

      this.stopMusic(); // Clean up current music source

      let buffer = this.bufferCache.get(file);
      if (!buffer) {
        try {
          const response = await fetch(getAssetPath(file));
          const arrayBuffer = await response.arrayBuffer();
          buffer = await this.context.decodeAudioData(arrayBuffer);
          this.bufferCache.set(file, buffer);
        } catch (err) {
          console.warn(`Failed to load music file: ${file}`, err);
          return;
        }
      }

      if (loopStartMs > 0) {
        // Phase 1: play intro (from 0 to full buffer), no loop
        const introSource = this.context.createBufferSource();
        introSource.buffer = buffer;
        introSource.loop = false;
        introSource.connect(this.channelGains['music']);
        introSource.start(0);

        this.currentMusicSource = introSource;
        this.currentMusicFile = file;
        this.isMusicLooping = false;

        introSource.onended = () => {
          if (this.currentMusicSource === introSource) {
            // Phase 2: create a looping source from loopStart onward
            const loopSource = this.context.createBufferSource();
            loopSource.buffer = buffer;
            loopSource.loop = true;
            loopSource.loopStart = loopStartMs / 1000;
            loopSource.loopEnd = buffer.duration;
            loopSource.connect(this.channelGains['music']);
            loopSource.start(0, loopStartMs / 1000);

            this.currentMusicSource = loopSource;
            this.currentMusicFile = file;
            this.isMusicLooping = true;
          }
        };
      } else {
        // Simple loop from start
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(this.channelGains['music']);
        source.start(0);

        this.currentMusicSource = source;
        this.currentMusicFile = file;
        this.isMusicLooping = true;
      }
    }

    public stopMusic(): void {
      if (this.currentMusicSource) {
        this.currentMusicSource.stop();
        this.currentMusicSource.disconnect();
        this.currentMusicSource = null;
        this.currentMusicFile = null;
        this.isMusicLooping = false;
      }
    }
}
