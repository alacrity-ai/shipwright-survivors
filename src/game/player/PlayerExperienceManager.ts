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
  private entropiumForNextLevel: number = 100;
  private powerUpsByLevel: Map<number, PowerUpChoice> = new Map();

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
    this.entropiumForNextLevel = this.getEntropiumRequirement(this.currentLevel);
  }

  private getEntropiumRequirement(level: number): number {
    if (level <= 1) return 100;
    if (level === 2) return 300;
    if (level === 3) return 600;
    if (level === 4) return 1000;
    if (level === 5) return 1500;
    if (level === 6) return 2100;
    if (level === 7) return 2800;
    if (level === 8) return 3600;
    if (level === 9) return 4500;
    return 5000; // fixed cost after level 10
  }
}
