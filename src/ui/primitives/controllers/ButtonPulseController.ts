// src/ui/primitives/controllers/ButtonPulseController.ts

export class ButtonPulseController {
  private pulseDuration: number;
  private pulseTimeRemaining: number = 0;
  private pulseSpeed: number;

  private alphaMin: number = 1.0;
  private alphaMax: number = 1.0;

  private isLooping: boolean = false;

  constructor(pulseDuration = 1.5, pulseSpeed = 4.0) {
    this.pulseDuration = pulseDuration;
    this.pulseSpeed = pulseSpeed;
  }

  /**
   * Triggers a one-shot pulse.
   */
  public trigger(alphaMin = 0.4, alphaMax = 1.2): void {
    this.isLooping = false;
    this.pulseTimeRemaining = this.pulseDuration;
    this.alphaMin = alphaMin;
    this.alphaMax = alphaMax;
  }

  /**
   * Starts a continuous pulsing loop (until stopPulse() is called).
   */
  public startPulse(alphaMin = 0.4, alphaMax = 1.2): void {
    this.isLooping = true;
    this.alphaMin = alphaMin;
    this.alphaMax = alphaMax;
    this.pulseTimeRemaining = this.pulseDuration;
  }

  /**
   * Stops a continuous pulsing loop.
   */
  public stopPulse(): void {
    this.isLooping = false;
    this.pulseTimeRemaining = 0;
  }

  /**
   * Updates the internal timer. Should be called every frame.
   */
  public update(dt: number): void {
    if (this.pulseTimeRemaining > 0) {
      this.pulseTimeRemaining -= dt;
      if (this.pulseTimeRemaining <= 0) {
        if (this.isLooping) {
          this.pulseTimeRemaining = this.pulseDuration; // restart loop
        } else {
          this.pulseTimeRemaining = 0;
        }
      }
    }
  }

  /**
   * Returns the current alpha multiplier for the pulse effect.
   */
  public getPulseAlphaMultiplier(): number {
    if (this.pulseTimeRemaining <= 0) return 1.0;

    const elapsed = this.pulseDuration - this.pulseTimeRemaining;
    const t = elapsed * this.pulseSpeed * Math.PI * 2;

    const normalized = (Math.sin(t) + 1) / 2;
    return this.alphaMin + (this.alphaMax - this.alphaMin) * normalized;
  }

  public isActive(): boolean {
    return this.pulseTimeRemaining > 0;
  }

  public isLoopingPulse(): boolean {
    return this.isLooping;
  }
}
