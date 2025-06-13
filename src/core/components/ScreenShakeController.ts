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

  trigger(strength: number, duration: number, frequency: number = 30): void {
    this.strength = strength;
    this.duration = duration;
    this.maxDuration = duration; // Store original duration
    this.frequency = frequency;
    this.time = 0;
    // Use different phases for X and Y to avoid diagonal-only shaking
    this.phaseX = Math.random() * Math.PI * 2;
    this.phaseY = Math.random() * Math.PI * 2;
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