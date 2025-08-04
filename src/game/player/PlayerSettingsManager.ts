// src/game/player/PlayerSettingsManager.ts

import { audioManager } from '@/audio/Audio';

export class PlayerSettingsManager {
  private static instance: PlayerSettingsManager;

  private aimMode: 'manual' | 'auto' = 'auto';

  private masterVolume: number = 1.0;
  private musicVolume: number = 1.0;
  private sfxVolume: number = 1.0;
  private dialogueVolume: number = 1.0;

  private damageTextEnabled: boolean = true;
  private particlesEnabled: boolean = true;
  private lightingEnabled: boolean = true;
  private collisionsEnabled: boolean = true;

  private specialFXEnabled: boolean = true;
  private environmentDetailsEnabled: boolean = true;
  private fireEffectsEnabled: boolean = true;

  private debugMode: boolean = false; // Set to false TODO: In prod set to false

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

  setAimMode(mode: 'manual' | 'auto'): void {
    this.aimMode = mode;
  }

  getAimMode(): 'manual' | 'auto' {
    return this.aimMode;
  }

  setSpecialFXEnabled(enabled: boolean): void {
    this.specialFXEnabled = enabled;
  }

  setEnvironmentDetailsEnabled(enabled: boolean): void {
    this.environmentDetailsEnabled = enabled;
  }

  setFireEffectsEnabled(enabled: boolean): void {
    this.fireEffectsEnabled = enabled;
  }

  setDamageTextEnabled(enabled: boolean): void {
    this.damageTextEnabled = enabled;
  }

  isDamageTextEnabled(): boolean {
    return this.damageTextEnabled;
  }

  setViewportWidth(w: number): void {
    this.viewportWidth = Math.max(640, w);
    this.notifyResolutionChange();
  }

  setViewportHeight(h: number): void {
    this.viewportHeight = Math.max(480, h);
    this.notifyResolutionChange();
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

  toggleDebugMode(): void {
    this.debugMode = !this.debugMode;
  }

  getDebugMode(): boolean { return this.debugMode; }
  getMasterVolume(): number { return this.masterVolume; }
  getMusicVolume(): number { return this.musicVolume; }
  getSfxVolume(): number { return this.sfxVolume; }
  getDialogueVolume(): number { return this.dialogueVolume; }

  isCollisionsEnabled(): boolean { return this.collisionsEnabled; }
  isParticlesEnabled(): boolean { return this.particlesEnabled; }
  isLightingEnabled(): boolean { return this.lightingEnabled; }
  isSpecialFXEnabled(): boolean { return this.specialFXEnabled; }
  isEnvironmentDetailsEnabled(): boolean { return this.environmentDetailsEnabled; }
  isFireEffectsEnabled(): boolean { return this.fireEffectsEnabled; }

  // === Serialization ===

  toJSON(): string {
    return JSON.stringify({
      aimMode: this.aimMode,
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      dialogueVolume: this.dialogueVolume,
      damageTextEnabled: this.damageTextEnabled,
      particlesEnabled: this.particlesEnabled,
      lightingEnabled: this.lightingEnabled,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
      interfaceScale: this.interfaceScale,
      specialFXEnabled: this.specialFXEnabled,
      environmentDetailsEnabled: this.environmentDetailsEnabled,
      fireEffectsEnabled: this.fireEffectsEnabled,
    });
  }

  fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed === 'object' && parsed !== null) {
        this.setAimMode(parsed.aimMode ?? this.aimMode);
        this.setMasterVolume(parsed.masterVolume ?? this.masterVolume);
        this.setMusicVolume(parsed.musicVolume ?? this.musicVolume);
        this.setSfxVolume(parsed.sfxVolume ?? this.sfxVolume);
        this.setDialogueVolume(parsed.dialogueVolume ?? this.dialogueVolume);
        this.setDamageTextEnabled(Boolean(parsed.damageTextEnabled ?? this.damageTextEnabled));
        this.setSpecialFXEnabled(Boolean(parsed.specialFXEnabled ?? this.specialFXEnabled));
        this.setEnvironmentDetailsEnabled(Boolean(parsed.environmentDetailsEnabled ?? this.environmentDetailsEnabled));
        this.setFireEffectsEnabled(Boolean(parsed.fireEffectsEnabled ?? this.fireEffectsEnabled));

        // TODO maybe set these later?
        this.particlesEnabled = Boolean(parsed.particlesEnabled ?? this.particlesEnabled);
        this.lightingEnabled = Boolean(parsed.lightingEnabled ?? this.lightingEnabled);
        this.collisionsEnabled = Boolean(parsed.collisionsEnabled ?? this.collisionsEnabled);
        this.specialFXEnabled = Boolean(parsed.specialFXEnabled ?? this.specialFXEnabled);
        this.environmentDetailsEnabled = Boolean(parsed.environmentDetailsEnabled ?? this.environmentDetailsEnabled);
        this.fireEffectsEnabled = Boolean(parsed.fireEffectsEnabled ?? this.fireEffectsEnabled);
        this.debugMode = Boolean(parsed.debugMode ?? this.debugMode);
        this.viewportWidth = Math.max(640, parsed.viewportWidth ?? this.viewportWidth);
        this.viewportHeight = Math.max(480, parsed.viewportHeight ?? this.viewportHeight);
        this.interfaceScale = Math.max(0.5, Math.min(2.0, parsed.interfaceScale ?? this.interfaceScale));
      }
    } catch (err) {
      console.warn('Failed to load player settings from JSON:', err);
    }
  }

  reset(): void {
    this.aimMode = 'manual';
    this.damageTextEnabled = true;
    this.masterVolume = 1.0;
    this.musicVolume = 1.0;
    this.sfxVolume = 1.0;
    this.dialogueVolume = 1.0;
    this.particlesEnabled = true;
    this.lightingEnabled = true;
    this.interfaceScale = 1.0;
    this.specialFXEnabled = true;
    this.environmentDetailsEnabled = true;
    this.fireEffectsEnabled = true;
  }

  private clampVolume(v: number): number {
    return Math.min(1, Math.max(0, v));
  }
}
