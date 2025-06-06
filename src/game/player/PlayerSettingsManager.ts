// src/game/player/PlayerSettingsManager.ts

export class PlayerSettingsManager {
  private static instance: PlayerSettingsManager;

  private masterVolume: number = 1.0;
  private musicVolume: number = 1.0;
  private sfxVolume: number = 1.0;
  private dialogueVolume: number = 1.0;

  private particlesEnabled: boolean = true;
  private lightingEnabled: boolean = true;
  private collisionsEnabled: boolean = true;

  private viewportWidth: number = 1920;
  private viewportHeight: number = 1080;
  private resolutionChangeCallbacks: (() => void)[] = [];

  private constructor() {}

  static getInstance(): PlayerSettingsManager {
    if (!PlayerSettingsManager.instance) {
      PlayerSettingsManager.instance = new PlayerSettingsManager();
    }
    return PlayerSettingsManager.instance;
  }

  onResolutionChange(cb: () => void): void {
    this.resolutionChangeCallbacks.push(cb);
  }

  private notifyResolutionChange(): void {
    for (const cb of this.resolutionChangeCallbacks) {
      cb();
    }
  }

  // === Getters and Setters ===

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

  setMasterVolume(value: number): void {
    this.masterVolume = this.clampVolume(value);
  }

  setMusicVolume(value: number): void {
    this.musicVolume = this.clampVolume(value);
  }

  setSfxVolume(value: number): void {
    this.sfxVolume = this.clampVolume(value);
  }

  setDialogueVolume(value: number): void {
    this.dialogueVolume = this.clampVolume(value);
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
    });
  }

  fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed === 'object' && parsed !== null) {
        this.masterVolume = this.clampVolume(parsed.masterVolume ?? this.masterVolume);
        this.musicVolume = this.clampVolume(parsed.musicVolume ?? this.musicVolume);
        this.sfxVolume = this.clampVolume(parsed.sfxVolume ?? this.sfxVolume);
        this.dialogueVolume = this.clampVolume(parsed.dialogueVolume ?? this.dialogueVolume);
        this.particlesEnabled = Boolean(parsed.particlesEnabled ?? this.particlesEnabled);
        this.lightingEnabled = Boolean(parsed.lightingEnabled ?? this.lightingEnabled);
        this.viewportWidth = Math.max(640, parsed.viewportWidth ?? this.viewportWidth);
        this.viewportHeight = Math.max(480, parsed.viewportHeight ?? this.viewportHeight);
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
  }

  private clampVolume(v: number): number {
    return Math.min(1, Math.max(0, v));
  }
}
