// src/core/save/SaveGameManager.ts

import { flags } from '@/game/player/PlayerFlagManager';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';

export interface SaveGameData {
  flags: string[];
  unlockedBlockIds: string[];
  passives?: any;
  version?: number;
}

export class SaveGameManager {
  private static instance: SaveGameManager;
  private saveSlot: number;

  private constructor(saveSlot: number) {
    this.saveSlot = saveSlot;
  }

  public static initialize(slot: number = 0): void {
    if (!SaveGameManager.instance) {
      SaveGameManager.instance = new SaveGameManager(slot);
    }
  }

  public static getInstance(): SaveGameManager {
    if (!SaveGameManager.instance) {
      throw new Error('SaveGameManager not initialized. Call initialize(slot) first.');
    }
    return SaveGameManager.instance;
  }

  private getStorageKey(): string {
    return `save${this.saveSlot}`;
  }

  private loadData(): SaveGameData {
    const raw = localStorage.getItem(this.getStorageKey());
    if (!raw) return { flags: [], unlockedBlockIds: [] };
    try {
      return JSON.parse(raw) as SaveGameData;
    } catch (e) {
      console.warn(`Failed to parse save data from ${this.getStorageKey()}:`, e);
      return { flags: [], unlockedBlockIds: [] };
    }
  }

  private writeData(data: SaveGameData): void {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(data));
  }

  // === SAVE METHODS ===

  public saveFlags(): void {
    const data = this.loadData();
    data.flags = JSON.parse(flags.toJSON());
    this.writeData(data);
  }

  public saveTechnology(): void {
    const data = this.loadData();
    data.unlockedBlockIds = JSON.parse(PlayerTechnologyManager.getInstance().toJSON());
    this.writeData(data);
  }

  public savePassives(): void {
    const data = this.loadData();
    data.passives = {}; // stub
    this.writeData(data);
  }

  // === LOAD METHODS ===

  public loadFlags(): void {
    const data = this.loadData();
    flags.fromJSON(JSON.stringify(data.flags ?? []));
  }

  public loadTechnology(): void {
    const data = this.loadData();
    PlayerTechnologyManager.getInstance().fromJSON(JSON.stringify(data.unlockedBlockIds ?? []));
  }

  public loadPassives(): void {
    const data = this.loadData();
    // stub
  }
}
