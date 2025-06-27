// src/game/player/PlayerExperienceManager.ts

import { 
  reportEntropiumAdded, 
  reportEntropiumLevelUp, 
  reportPowerupChosen 
} from '@/core/interfaces/events/PlayerExperienceReporter';

export interface PowerUpChoice {
  id: string;          // Unique identifier of the powerup (e.g., 'turret-damage-10')
  label: string;       // Display name used in UI
  metadata?: any;      // Optional payload for targeting or effect data
}

export class PlayerExperienceManager {
  private static instance: PlayerExperienceManager;

  // === Runtime Fields ===
  private currentEntropium: number = 0;
  private currentLevel: number = 1;
  private entropiumForNextLevel: number = PlayerExperienceManager.BASE_XP_REQUIREMENT;
  private powerUpsByLevel: Map<number, PowerUpChoice> = new Map();

  // === Configurable Progression Constants ===
  private static readonly BASE_XP_REQUIREMENT = 200;
  private static readonly LEVEL_MULTIPLIER = 2;

  private constructor() {}

  public static getInstance(): PlayerExperienceManager {
    if (!PlayerExperienceManager.instance) {
      PlayerExperienceManager.instance = new PlayerExperienceManager();
    }
    return PlayerExperienceManager.instance;
  }

  // === Public API ===

  public getLevel(): number {
    return this.currentLevel;
  }

  public getEntropium(): number {
    return this.currentEntropium;
  }

  public getEntropiumForNextLevel(): number {
    return this.entropiumForNextLevel;
  }

  public canLevelUp(): boolean {
    return this.currentEntropium >= this.entropiumForNextLevel;
  }

  public tryLevelUp(): boolean {
    if (this.currentEntropium < this.entropiumForNextLevel) return false;

    this.currentEntropium -= this.entropiumForNextLevel;
    this.currentLevel += 1;
    this.updateEntropiumThreshold();
    reportEntropiumLevelUp(this.currentLevel);
    return true;
  }

  public getPendingLevelUps(): number {
    let simulatedXP = this.currentEntropium;
    let simulatedLevel = this.currentLevel;
    let pending = 0;

    const base = PlayerExperienceManager.BASE_XP_REQUIREMENT;
    const multiplier = PlayerExperienceManager.LEVEL_MULTIPLIER;

    while (simulatedXP >= Math.floor(base * Math.pow(multiplier, simulatedLevel - 1))) {
      simulatedXP -= Math.floor(base * Math.pow(multiplier, simulatedLevel - 1));
      simulatedLevel += 1;
      pending += 1;
    }

    return pending;
  }

  public addEntropium(amount: number): void {
    if (amount > 0) {
      const floored = Math.floor(amount);
      this.currentEntropium += floored;
      reportEntropiumAdded(floored);
      this.tryLevelUp();
    }
  }

  public subtractEntropium(amount: number): void {
    this.currentEntropium = Math.max(0, this.currentEntropium - Math.floor(amount));
  }

  public addPowerUp(choice: PowerUpChoice): void {
    this.powerUpsByLevel.set(this.currentLevel, choice);
    reportPowerupChosen(choice);
  }

  public getPowerUps(): PowerUpChoice[] {
    return Array.from(this.powerUpsByLevel.values());
  }

  public getPowerUpAtLevel(level: number): PowerUpChoice | undefined {
    return this.powerUpsByLevel.get(level);
  }

  public reset(): void {
    this.currentEntropium = 0;
    this.currentLevel = 1;
    this.powerUpsByLevel.clear();
    this.updateEntropiumThreshold();
  }

  public destroy(): void {
    this.reset();
    PlayerExperienceManager.instance = null as any;
  }

  // === Internal ===

  private updateEntropiumThreshold(): void {
    const base = PlayerExperienceManager.BASE_XP_REQUIREMENT;
    const multiplier = PlayerExperienceManager.LEVEL_MULTIPLIER;
    this.entropiumForNextLevel = Math.floor(base * Math.pow(multiplier, this.currentLevel - 1));
  }
}
