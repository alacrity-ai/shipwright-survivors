// src/core/components/ScreenShakeController.ts

export class ScreenShakeController {
  private strength: number = 0;
  private duration: number = 0;
  private maxDuration: number = 0; // Store original duration for falloff calculation
  private frequency: number = 30; // Hz
  private time: number = 0;
  private phaseX: number = 0;
  private phaseY: number = 0;

  private offsetX: number = 0;
  private offsetY: number = 0;

  private static readonly DEFAULT_TAG = 'default';
  private readonly tagCooldowns: Map<string, number> = new Map();
  private readonly tagCooldownDurations: Map<string, number> = new Map([
    ['enemyDestruction', 0.8], // In seconds
    ['default', 0],            // No cooldown by default
  ]);

  trigger(strength: number, duration: number, frequency: number = 30, tag: string = 'default'): void {
    this.strength = strength;
    this.duration = duration;
    this.maxDuration = duration; // Store original duration
    this.frequency = frequency;
    this.time = 0;
    // Use different phases for X and Y to avoid diagonal-only shaking
    this.phaseX = Math.random() * Math.PI * 2;
    this.phaseY = Math.random() * Math.PI * 2;
  }

  /**
   * Triggers a screen shake only if the tag is not on cooldown.
   * Returns true if the shake was applied.
   */
  public triggerIfAllowed(
    strength: number,
    duration: number,
    frequency: number = 30,
    tag: string = ScreenShakeController.DEFAULT_TAG
  ): boolean {
    const now = performance.now() / 1000;
    const lastTime = this.tagCooldowns.get(tag) ?? -Infinity;
    const cooldown = this.tagCooldownDurations.get(tag) ?? 0;

    if (now - lastTime < cooldown) return false;

    this.tagCooldowns.set(tag, now);
    this.trigger(strength, duration, frequency, tag);
    return true;
  }

  update(dt: number): void {
    if (this.duration <= 0) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    this.time += dt;
    this.duration -= dt;

    // Calculate falloff: start at 1.0, end at 0.0
    const falloff = Math.max(0, this.duration / this.maxDuration);
    
    // Use sine waves for smooth oscillation
    const frequencyRadians = this.frequency * 2 * Math.PI;
    const currentStrength = this.strength * falloff;

    // Generate smooth oscillating shake
    this.offsetX = Math.sin(this.time * frequencyRadians + this.phaseX) * currentStrength;
    this.offsetY = Math.sin(this.time * frequencyRadians + this.phaseY) * currentStrength;
  }

  getOffset(): { x: number; y: number } {
    return { x: this.offsetX, y: this.offsetY };
  }

  // Helper method to check if shake is active
  isActive(): boolean {
    return this.duration > 0;
  }

  // Helper method to stop shake immediately
  stop(): void {
    this.duration = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }
}

