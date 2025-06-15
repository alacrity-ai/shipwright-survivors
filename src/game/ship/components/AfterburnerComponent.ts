// src/game/ship/components/AfterburnerComponent.ts

export class AfterburnerComponent {
  private current: number;
  private max: number;
  private rechargePerSecond: number;
  private consumptionPerSecond: number;
  private active: boolean = false;

  constructor(
    maxFuel: number,
    rechargePerSecond: number = 5,
    consumptionPerSecond: number = 5
  ) {
    this.max = maxFuel;
    this.current = maxFuel;
    this.rechargePerSecond = rechargePerSecond;
    this.consumptionPerSecond = consumptionPerSecond;
  }

  update(dt: number): void {
    if (this.active) {
      const fuelUsage = this.consumptionPerSecond * dt;
      this.current -= fuelUsage;

      if (this.current <= 0) {
        this.current = 0;
        this.active = false;
      }
    } else if (this.rechargePerSecond > 0) {
      this.current = Math.min(this.current + this.rechargePerSecond * dt, this.max);
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
  }

  // === Activation ===
  setActive(active: boolean): boolean {
    if (active) {
      if (this.active) {
        // Already active
        return true;
      }
      if (this.current >= 10) {
        this.active = true;
        return true;
      } else {
        // Not enough fuel to activate
        return false;
      }
    } else {
      // Always allow deactivation
      this.active = false;
      return false;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  // === Accessors ===
  getCurrent(): number {
    return this.current;
  }

  getMax(): number {
    return this.max;
  }

  setMax(newMax: number): void {
    this.max = newMax;
    this.current = Math.min(this.current, newMax);
  }

  setRechargeRate(rate: number): void {
    this.rechargePerSecond = rate;
  }

  getConsumptionRatePerSecond(): number {
    return this.consumptionPerSecond;
  }

  setConsumptionRatePerSecond(rate: number): void {
    this.consumptionPerSecond = rate;
  }
}
