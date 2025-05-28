// src/game/ship/components/EnergyComponent.ts

export class EnergyComponent {
  private current: number;
  private max: number;
  private rechargePerSecond: number;

  private timeSinceLastUse = 0;
  private rechargeDelay = 0.25; // seconds of inactivity before recharge starts

  constructor(maxEnergy: number, rechargePerSecond: number) {
    this.max = maxEnergy;
    this.current = maxEnergy;
    this.rechargePerSecond = rechargePerSecond;
  }

  update(dt: number): void {
    this.timeSinceLastUse += dt;
    if (this.timeSinceLastUse >= this.rechargeDelay) {
      this.current = Math.min(this.current + this.rechargePerSecond * dt, this.max);
    }
  }

  spend(amount: number): boolean {
    if (this.current < amount) return false;
    this.current -= amount;
    this.timeSinceLastUse = 0;
    return true;
  }

  add(amount: number): void {
    this.current = Math.min(this.current + amount, this.max);
  }

  reset(): void {
    this.current = this.max;
    this.timeSinceLastUse = 0;
  }

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

  setMaxEnergy(max: number): void {
    this.max = max;
    this.current = Math.min(this.current, max);
  }
}
