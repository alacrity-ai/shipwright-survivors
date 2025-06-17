// src/audio/AudioManager.ts

import { getAssetPath } from '@/shared/assetHelpers';

export type AudioChannel = 'music' | 'sfx' | 'dialogue';

export interface MusicTrack {
  file: string;
  loopStartMs?: number;
}

type PlayOptions = {
  pitch?: number;
  maxSimultaneous?: number;
  volume?: number; // 0.0 to 1.0, default: 1.0
  pan?: number; // -1.0 (left) to 1.0 (right), default: 0.0 (center)
};

type LoopGraph = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  pan: StereoPannerNode;
};

const FADE_DURATION = 0.2; // seconds (30ms is perceptually instantaneous)

export class AudioManager {
  private context: AudioContext;
  private masterGain: GainNode;
  private channelGains: Record<AudioChannel, GainNode>;
  private bufferCache = new Map<string, AudioBuffer>();
  private currentlyPlaying = new Map<string, number>();
  private activeLoops = new Map<string, Set<LoopGraph>>();   
  private loopStartLocks = new Map<string, Promise<void>>();
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

  public async play(file: string, channel: AudioChannel, options?: PlayOptions): Promise<boolean> {
    const maxSimultaneous = options?.maxSimultaneous ?? 1;
    const volume = Math.max(0, Math.min(1, options?.volume ?? 1.0));
    const pan = Math.max(-1, Math.min(1, options?.pan ?? 0));

    const currentCount = this.currentlyPlaying.get(file) ?? 0;
    if (currentCount >= maxSimultaneous) return false;

    let buffer = this.bufferCache.get(file);
    if (!buffer) {
      try {
        const response = await fetch(getAssetPath(file));
        const arrayBuffer = await response.arrayBuffer();
        buffer = await this.context.decodeAudioData(arrayBuffer);
        this.bufferCache.set(file, buffer);
      } catch (err) {
        console.warn(`Failed to load audio file: ${file}`, err);
        return false;
      }
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = options?.pitch ?? 1.0;

    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;

    const panNode = this.context.createStereoPanner();
    panNode.pan.value = pan;

    // Connect: source → gain → pan → channelGain
    source.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(this.channelGains[channel]);

    this.currentlyPlaying.set(file, currentCount + 1);

    source.onended = () => {
      const prev = this.currentlyPlaying.get(file) ?? 1;
      const next = Math.max(0, prev - 1);
      if (next === 0) {
        this.currentlyPlaying.delete(file);
      } else {
        this.currentlyPlaying.set(file, next);
      }
    };

    source.start(0);
    return true;
  }

  public async startLoop(file: string, channel: AudioChannel, options?: PlayOptions): Promise<void> {
    if (this.activeLoops.has(file) && this.activeLoops.get(file)!.size > 0) return;

    if (this.loopStartLocks.has(file)) {
      await this.loopStartLocks.get(file);
      return;
    }

    const lock = this._startLoopInternal(file, channel, options);
    this.loopStartLocks.set(file, lock);
    await lock;
    this.loopStartLocks.delete(file);
  }

  private async _startLoopInternal(file: string, channel: AudioChannel, options?: PlayOptions): Promise<void> {
    let buffer = this.bufferCache.get(file);
    if (!buffer) {
      try {
        const response = await fetch(getAssetPath(file));
        const arrayBuffer = await response.arrayBuffer();
        buffer = await this.context.decodeAudioData(arrayBuffer);
        this.bufferCache.set(file, buffer);
      } catch (err) {
        console.warn(`[AudioManager] Failed to load audio file: ${file}`, err);
        return;
      }
    }

    const volume = Math.max(0, Math.min(1, options?.volume ?? 1.0));
    const pan = Math.max(-1, Math.min(1, options?.pan ?? 0));
    const pitch = options?.pitch ?? 1.0;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = pitch;

    const gainNode = this.context.createGain();
    const now = this.context.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + FADE_DURATION);

    const panNode = this.context.createStereoPanner();
    panNode.pan.value = pan;

    source.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(this.channelGains[channel]);

    const graph: LoopGraph = { source, gain: gainNode, pan: panNode };

    if (!this.activeLoops.has(file)) {
      this.activeLoops.set(file, new Set());
    }
    this.activeLoops.get(file)!.add(graph);

    source.start(0);
  }

  public stopLoop(file: string): void {
    const loopSet = this.activeLoops.get(file);
    if (!loopSet || loopSet.size === 0) return;

    const now = this.context.currentTime;

    for (const { source, gain, pan } of loopSet) {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + FADE_DURATION);
      } catch (err) {
        console.warn(`[AudioManager] Fade-out error for ${file}`, err);
      }

      setTimeout(() => {
        try {
          source.stop();
        } catch (e) {
          console.warn(`[AudioManager] Failed to stop source for ${file}`, e);
        }

        try {
          source.disconnect();
          gain.disconnect();
          pan.disconnect();
        } catch (e) {
          console.warn(`[AudioManager] Failed to disconnect nodes for ${file}`, e);
        }
      }, FADE_DURATION * 1000);
    }

    this.activeLoops.delete(file);
  }

  public stopAllLoops(): void {
    for (const file of this.activeLoops.keys()) {
      this.stopLoop(file);
    }
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
