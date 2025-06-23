// src/game/player/PlayerSettingsManager.ts

import { audioManager } from '@/audio/Audio';

import { reportResolutionChange } from '@/core/interfaces/events/ResolutionChangeReporter';

export class PlayerSettingsManager {
  private static instance: PlayerSettingsManager;

  private masterVolume: number = 1.0;
  private musicVolume: number = 1.0;
  private sfxVolume: number = 1.0;
  private dialogueVolume: number = 1.0;

  private particlesEnabled: boolean = true;
  private lightingEnabled: boolean = true;
  private collisionsEnabled: boolean = true;

  private debugMode: boolean = false;

  private viewportWidth: number = 1920;
  private viewportHeight: number = 1080;
  private resolutionChangeCallbacks: (() => void)[] = [];
  private interfaceScaleChangeCallbacks: (() => void)[] = [];

  private interfaceScale: number = 1.0;

  private constructor() {}

  static getInstance(): PlayerSettingsManager {
    if (!PlayerSettingsManager.instance) {
      PlayerSettingsManager.instance = new PlayerSettingsManager();
    }
    return PlayerSettingsManager.instance;
  }

  onResolutionChange(cb: () => void): () => void {
    this.resolutionChangeCallbacks.push(cb);
    return () => {
      this.resolutionChangeCallbacks = this.resolutionChangeCallbacks.filter(fn => fn !== cb);
    };
  }

  private notifyResolutionChange(): void {
    for (const cb of this.resolutionChangeCallbacks) {
      cb();
    }
  }

  // DEPRECATED
  onInterfaceScaleChange(cb: () => void): () => void {
    this.interfaceScaleChangeCallbacks.push(cb);
    return () => {
      this.interfaceScaleChangeCallbacks = this.interfaceScaleChangeCallbacks.filter(fn => fn !== cb);
    };
  }

  // DEPRECATED
  private notifyInterfaceScaleChange(): void {
    for (const cb of this.interfaceScaleChangeCallbacks) {
      cb();
    }
  }

  // === Getters and Setters ===

  setViewportWidth(w: number): void {
    this.viewportWidth = Math.max(640, w);
    this.notifyResolutionChange();
    reportResolutionChange(this.viewportWidth, this.viewportHeight);
  }

  setViewportHeight(h: number): void {
    this.viewportHeight = Math.max(480, h);
    this.notifyResolutionChange();
    reportResolutionChange(this.viewportWidth, this.viewportHeight);
  }

  getViewportWidth(): number {
    return this.viewportWidth;
  }

  getViewportHeight(): number {
    return this.viewportHeight;
  }

  // DEPRECATED
  setInterfaceScale(scale: number): void {
    const clamped = Math.max(0.5, Math.min(2.0, scale));
    if (this.interfaceScale !== clamped) {
      this.interfaceScale = clamped;
      this.notifyInterfaceScaleChange();
    }
  }

  // DEPRECATED
  getInterfaceScale(): number {
    // DEPRECATED, Returning 2 always now
    return 2.0;
    // return this.interfaceScale;
  }

  setMasterVolume(value: number): void {
    this.masterVolume = this.clampVolume(value);
    audioManager.setMasterVolume(this.masterVolume);
  }

  setMusicVolume(value: number): void {
    this.musicVolume = this.clampVolume(value);
    audioManager.setChannelVolume('music', this.musicVolume);
  }

  setSfxVolume(value: number): void {
    this.sfxVolume = this.clampVolume(value);
    audioManager.setChannelVolume('sfx', this.sfxVolume);
  }

  setDialogueVolume(value: number): void {
    this.dialogueVolume = this.clampVolume(value);
    audioManager.setChannelVolume('dialogue', this.dialogueVolume);
  }

  setParticlesEnabled(enabled: boolean): void {
    this.particlesEnabled = enabled;
  }

  setLightingEnabled(enabled: boolean): void {
    this.lightingEnabled = enabled;
  }

  setCollisionsEnabled(enabled: boolean): void {
    this.collisionsEnabled = enabled;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  getDebugMode(): boolean { return this.debugMode; }
  getMasterVolume(): number { return this.masterVolume; }
  getMusicVolume(): number { return this.musicVolume; }
  getSfxVolume(): number { return this.sfxVolume; }
  getDialogueVolume(): number { return this.dialogueVolume; }

  isCollisionsEnabled(): boolean { return this.collisionsEnabled; }
  isParticlesEnabled(): boolean { return this.particlesEnabled; }
  isLightingEnabled(): boolean { return this.lightingEnabled; }

  // === Serialization ===

  toJSON(): string {
    return JSON.stringify({
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      dialogueVolume: this.dialogueVolume,
      particlesEnabled: this.particlesEnabled,
      lightingEnabled: this.lightingEnabled,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
      interfaceScale: this.interfaceScale,
    });
  }

  fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed === 'object' && parsed !== null) {
        this.setMasterVolume(parsed.masterVolume ?? this.masterVolume);
        this.setMusicVolume(parsed.musicVolume ?? this.musicVolume);
        this.setSfxVolume(parsed.sfxVolume ?? this.sfxVolume);
        this.setDialogueVolume(parsed.dialogueVolume ?? this.dialogueVolume);

        // TODO maybe set these later?
        this.particlesEnabled = Boolean(parsed.particlesEnabled ?? this.particlesEnabled);
        this.lightingEnabled = Boolean(parsed.lightingEnabled ?? this.lightingEnabled);
        this.viewportWidth = Math.max(640, parsed.viewportWidth ?? this.viewportWidth);
        this.viewportHeight = Math.max(480, parsed.viewportHeight ?? this.viewportHeight);
        this.interfaceScale = Math.max(0.5, Math.min(2.0, parsed.interfaceScale ?? this.interfaceScale));
      }
    } catch (err) {
      console.warn('Failed to load player settings from JSON:', err);
    }
  }

  reset(): void {
    this.masterVolume = 1.0;
    this.musicVolume = 1.0;
    this.sfxVolume = 1.0;
    this.dialogueVolume = 1.0;
    this.particlesEnabled = true;
    this.lightingEnabled = true;
    this.interfaceScale = 1.0;
  }

  private clampVolume(v: number): number {
    return Math.min(1, Math.max(0, v));
  }
}
