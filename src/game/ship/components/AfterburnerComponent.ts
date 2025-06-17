// src/game/ship/components/AfterburnerComponent.ts

export class AfterburnerComponent {
  private current: number;
  private max: number;
  private rechargePerSecond: number;
  private consumptionPerSecond: number;

  private readonly BASE_MAX_FUEL = 100;
  private readonly RECHARGE_DURATION_SECONDS = 8; // e.g., full recharge in 20s

  private speedMultiplier: number = 1.5;
  private accelerationMultiplier: number = 2.0;
  private pulseMultiplier: number = 1.5;
  private superPulseBonusMultiplier: number = 0.5;

  private readonly TRIGGER_COOLDOWN = 1.0; // seconds between allowed re-triggers
  private triggerCooldownRemaining: number = 0;

  private readonly PULSE_WINDOW = 0.4; // seconds after deactivation to allow pulse
  private readonly PULSE_DURATION = 6.0; // seconds of pulse bonus
  private readonly PULSE_COOLDOWN = 2.0; // seconds before next pulse can occur

  private readonly PULSE_PERFECT_WINDOW = 0.2; // seconds for super pulse
  private readonly pulsePerfectTimingFuelRefundAmount = 25;

  private pulseDurationRemaining: number = 0;
  private pulseCooldownRemaining: number = 0;
  private superPulseDurationRemaining: number = 0;

  private afterburnerJustActivated: boolean = false;
  private pulseJustActivated: boolean = false;
  private superPulseJustActivated: boolean = false;

  private lastDeactivationTime: number | null = null;
  private active: boolean = false;

  constructor(
    maxFuel: number,
    _rechargePerSecond: number = 5, // No longer used
    consumptionPerSecond: number = 5
  ) {
    this.max = maxFuel;
    this.current = maxFuel;
    this.rechargePerSecond = maxFuel / this.RECHARGE_DURATION_SECONDS;
    this.consumptionPerSecond = consumptionPerSecond;
  }

  update(dt: number): void {

    // === Trigger cooldown decrement ===
    if (this.triggerCooldownRemaining > 0) {
      this.triggerCooldownRemaining -= dt;
      if (this.triggerCooldownRemaining < 0) {
        this.triggerCooldownRemaining = 0;
      }
    }

    // === Fuel drain or recharge ===
    if (this.active) {
      const fuelUsage = this.consumptionPerSecond * dt;
      this.current -= fuelUsage;
      if (this.current <= 0) {
        this.current = 0;
        this.active = false;
        this.lastDeactivationTime = performance.now() / 1000;
        this.pulseDurationRemaining = 0;
      }
    } else if (this.rechargePerSecond > 0) {
      this.current = Math.min(this.current + this.rechargePerSecond * dt, this.max);
    }

    // === Pulse duration decrement ===
    if (this.pulseDurationRemaining > 0) {
      this.pulseDurationRemaining -= dt;
      if (this.pulseDurationRemaining <= 0) {
        this.pulseDurationRemaining = 0;
      }
    }

    // === Super Pulse duration decrement ===
    if (this.superPulseDurationRemaining > 0) {
      this.superPulseDurationRemaining -= dt;
      if (this.superPulseDurationRemaining <= 0) {
        this.superPulseDurationRemaining = 0;
      }
    }

    // === Pulse cooldown decrement ===
    if (this.pulseCooldownRemaining > 0) {
      this.pulseCooldownRemaining -= dt;
      if (this.pulseCooldownRemaining < 0) {
        this.pulseCooldownRemaining = 0;
      }
    }
  }

  consume(amount: number): boolean {
    if (this.current < amount) return false;
    this.current -= amount;
    return true;
  }

  refill(amount: number): void {
    this.current = Math.min(this.current + amount, this.max);
  }

  reset(): void {
    this.current = this.max;
    this.active = false;
    this.lastDeactivationTime = null;
    this.pulseDurationRemaining = 0;
    this.pulseCooldownRemaining = 0;
    this.pulseJustActivated = false;
    this.superPulseJustActivated = false;
  }

  setActive(active: boolean): boolean {
    const now = performance.now() / 1000;

    if (active) {
      // Already active → allow continuation
      if (this.active) return true;

      // Cooldown gating: prevent re-trigger spam
      if (this.triggerCooldownRemaining > 0) return false;

      // Sufficient fuel required
      if (this.current >= 10) {
        const timeSinceDeactivation =
          this.lastDeactivationTime !== null ? now - this.lastDeactivationTime : Infinity;

        // Pulse eligibility window
        const eligibleForPulse =
          this.pulseCooldownRemaining <= 0 &&
          timeSinceDeactivation <= this.PULSE_WINDOW;

        if (eligibleForPulse) {
          this.pulseDurationRemaining = this.PULSE_DURATION;
          this.pulseCooldownRemaining = this.PULSE_COOLDOWN;
          this.pulseJustActivated = true;

          // === Refined Just Timing ===
          const inPerfectWindow =
            timeSinceDeactivation >= (this.PULSE_WINDOW - this.PULSE_PERFECT_WINDOW);

          if (inPerfectWindow) {
            this.current = Math.min(
              this.current + this.pulsePerfectTimingFuelRefundAmount,
              this.max
            );
            this.superPulseJustActivated = true;
            this.superPulseDurationRemaining = this.PULSE_DURATION;
          }
        }

        this.active = true;
        this.triggerCooldownRemaining = this.TRIGGER_COOLDOWN;
        this.afterburnerJustActivated = true;
        return true;
      }

      return false; // Insufficient fuel
    } else {
      // Deactivation
      if (this.active) {
        this.lastDeactivationTime = now;
      }
      this.active = false;
      return false;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  isPulsing(): boolean {
    return this.pulseDurationRemaining > 0;
  }

  getCurrent(): number {
    return this.current;
  }

  getMax(): number {
    return this.max;
  }

  setMax(newMax: number): void {
    this.max = newMax + this.BASE_MAX_FUEL;
    this.current = Math.min(this.current, this.max);
    this.rechargePerSecond = this.max / this.RECHARGE_DURATION_SECONDS;
  }

  // Deprecated
  // setRechargeRate(rate: number): void {
  //   this.rechargePerSecond = rate;
  // }

  getConsumptionRatePerSecond(): number {
    return this.consumptionPerSecond;
  }

  setConsumptionRatePerSecond(rate: number): void {
    this.consumptionPerSecond = rate;
  }

  getSpeedMultiplier(): number {
    const pulseFactor = this.getPulseDecayFactor();
    const superPulseFactor = this.getSuperPulseDecayFactor();
    return this.speedMultiplier +
      this.pulseMultiplier * pulseFactor +
      this.superPulseBonusMultiplier * superPulseFactor;
  }

  getAccelerationMultiplier(): number {
    const pulseFactor = this.getPulseDecayFactor();
    const superPulseFactor = this.getSuperPulseDecayFactor();
    return this.accelerationMultiplier +
      this.pulseMultiplier * pulseFactor +
      this.superPulseBonusMultiplier * superPulseFactor;
  }

  getPulseMultiplier(): number {
    return this.pulseMultiplier;
  }

  private getPulseDecayFactor(): number {
    return this.pulseDurationRemaining > 0
      ? this.pulseDurationRemaining / this.PULSE_DURATION
      : 0;
  }

  wasAfterburnerJustActivated(): boolean {
    const was = this.afterburnerJustActivated;
    this.afterburnerJustActivated = false;
    return was;
  }

  wasPulseJustActivated(): boolean {
    const was = this.pulseJustActivated;
    this.pulseJustActivated = false;
    return was;
  }

  wasSuperPulseJustActivated(): boolean {
    const was = this.superPulseJustActivated;
    this.superPulseJustActivated = false;
    return was;
  }

  getPulseCooldownRemaining(): number {
    return this.pulseCooldownRemaining;
  }

  /**
   * Returns true if activating afterburner at this moment
   * would trigger a pulse (if fuel is sufficient).
   */
  wouldTriggerPulseNow(): boolean {
    const now = performance.now() / 1000;
    return (
      this.pulseCooldownRemaining <= 0 &&
      this.lastDeactivationTime !== null &&
      now - this.lastDeactivationTime <= this.PULSE_WINDOW
    );
  }

  /**
   * Returns seconds remaining in the current pulse activation window.
   * Returns 0 if the window has expired or never started.
   */
  getPulseWindowRemaining(): number {
    if (this.lastDeactivationTime === null) return 0;

    const now = performance.now() / 1000;
    const elapsed = now - this.lastDeactivationTime;
    return Math.max(0, this.PULSE_WINDOW - elapsed);
  }

  /**
   * Returns seconds remaining in the perfect-timing (super pulse) window.
   * Returns 0 if outside the super pulse window or if pulse window expired.
   */
  getSuperPulseWindowRemaining(): number {
    if (this.lastDeactivationTime === null) return 0;

    const now = performance.now() / 1000;
    const elapsed = now - this.lastDeactivationTime;
    const superPulseStart = this.PULSE_WINDOW - this.PULSE_PERFECT_WINDOW;

    if (elapsed < superPulseStart || elapsed > this.PULSE_WINDOW) return 0;
    return Math.max(0, this.PULSE_WINDOW - elapsed);
  }

  private getSuperPulseDecayFactor(): number {
    return this.superPulseDurationRemaining > 0
      ? this.superPulseDurationRemaining / this.PULSE_DURATION
      : 0;
  }
}
