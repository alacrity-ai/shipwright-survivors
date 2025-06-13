// src/game/player/PlayerStats.ts

import { FiringMode } from '@/systems/combat/types/WeaponTypes';

/**
 * Singleton managing real-time player stats such as energy, modifiers, etc.
 */
export class PlayerStats {
  private static instance: PlayerStats;

  private energy: number = 100;
  private maxEnergy: number = 100;
  private onEnergyChangeCallbacks: ((newEnergy: number, maxEnergy: number) => void)[] = [];
  private firingMode: FiringMode = FiringMode.Sequence;

  private constructor() {}

  public static getInstance(): PlayerStats {
    if (!PlayerStats.instance) {
      PlayerStats.instance = new PlayerStats();
    }
    return PlayerStats.instance;
  }

  public initialize(startingEnergy: number = 100): void {
    this.energy = startingEnergy;
    this.maxEnergy = startingEnergy;
  }

  public getFiringMode(): FiringMode {
    return this.firingMode;
  }

  public setFiringMode(mode: FiringMode): void {
    this.firingMode = mode;
  }

  public getEnergy(): number {
    return this.energy;
  }

  public getMaxEnergy(): number {
    return this.maxEnergy;
  }

  public setEnergy(value: number): void {
    this.energy = Math.max(0, Math.min(this.maxEnergy, value));
    this.notifyEnergyChange();
  }

  public spendEnergy(amount: number): boolean {
    if (amount > this.energy) return false;
    this.energy -= amount;
    this.notifyEnergyChange();
    return true;
  }

  public addEnergy(amount: number): void {
    this.energy = Math.min(this.energy + amount, this.maxEnergy);
    this.notifyEnergyChange();
  }

  public onEnergyChange(callback: (current: number, max: number) => void): void {
    this.onEnergyChangeCallbacks.push(callback);
  }

  private notifyEnergyChange(): void {
    for (const cb of this.onEnergyChangeCallbacks) {
      cb(this.energy, this.maxEnergy);
    }
  }

  public reset(): void {
    this.energy = this.maxEnergy;
    this.notifyEnergyChange();
  }

  public destroy(): void {
    this.energy = 0;
    this.maxEnergy = 0;
    this.onEnergyChangeCallbacks.length = 0;
  }
}
