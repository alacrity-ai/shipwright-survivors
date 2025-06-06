// src/game/player/PlayerSettingsManager.ts
export class PlayerSettingsManager {
    static instance;
    masterVolume = 1.0;
    musicVolume = 1.0;
    sfxVolume = 1.0;
    dialogueVolume = 1.0;
    particlesEnabled = true;
    lightingEnabled = true;
    collisionsEnabled = true;
    viewportWidth = 1920;
    viewportHeight = 1080;
    resolutionChangeCallbacks = [];
    constructor() { }
    static getInstance() {
        if (!PlayerSettingsManager.instance) {
            PlayerSettingsManager.instance = new PlayerSettingsManager();
        }
        return PlayerSettingsManager.instance;
    }
    onResolutionChange(cb) {
        this.resolutionChangeCallbacks.push(cb);
    }
    notifyResolutionChange() {
        for (const cb of this.resolutionChangeCallbacks) {
            cb();
        }
    }
    // === Getters and Setters ===
    setViewportWidth(w) {
        this.viewportWidth = Math.max(640, w);
        this.notifyResolutionChange();
    }
    setViewportHeight(h) {
        this.viewportHeight = Math.max(480, h);
        this.notifyResolutionChange();
    }
    getViewportWidth() {
        return this.viewportWidth;
    }
    getViewportHeight() {
        return this.viewportHeight;
    }
    setMasterVolume(value) {
        this.masterVolume = this.clampVolume(value);
    }
    setMusicVolume(value) {
        this.musicVolume = this.clampVolume(value);
    }
    setSfxVolume(value) {
        this.sfxVolume = this.clampVolume(value);
    }
    setDialogueVolume(value) {
        this.dialogueVolume = this.clampVolume(value);
    }
    setParticlesEnabled(enabled) {
        this.particlesEnabled = enabled;
    }
    setLightingEnabled(enabled) {
        this.lightingEnabled = enabled;
    }
    setCollisionsEnabled(enabled) {
        this.collisionsEnabled = enabled;
    }
    getMasterVolume() { return this.masterVolume; }
    getMusicVolume() { return this.musicVolume; }
    getSfxVolume() { return this.sfxVolume; }
    getDialogueVolume() { return this.dialogueVolume; }
    isCollisionsEnabled() { return this.collisionsEnabled; }
    isParticlesEnabled() { return this.particlesEnabled; }
    isLightingEnabled() { return this.lightingEnabled; }
    // === Serialization ===
    toJSON() {
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
    fromJSON(json) {
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
        }
        catch (err) {
            console.warn('Failed to load player settings from JSON:', err);
        }
    }
    reset() {
        this.masterVolume = 1.0;
        this.musicVolume = 1.0;
        this.sfxVolume = 1.0;
        this.dialogueVolume = 1.0;
        this.particlesEnabled = true;
        this.lightingEnabled = true;
    }
    clampVolume(v) {
        return Math.min(1, Math.max(0, v));
    }
}
