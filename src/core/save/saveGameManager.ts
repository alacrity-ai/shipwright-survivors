import { flags } from '@/game/player/PlayerFlagManager';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { PlayerPassiveManager } from '@/game/player/PlayerPassiveManager';

export interface SaveGameData {
  flags: string[];
  unlockedBlockIds: string[];
  settings?: string; // JSON stringified settings blob
  passives?: any;     // Parsed passive manager state
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

  // === Convenience Methods ===

  public saveAll(): void {
    const data: SaveGameData = {
      flags: JSON.parse(flags.toJSON()),
      unlockedBlockIds: JSON.parse(PlayerTechnologyManager.getInstance().toJSON()),
      settings: PlayerSettingsManager.getInstance().toJSON(),
      passives: JSON.parse(PlayerPassiveManager.getInstance().toJSON()),
      version: 1
    };
    this.writeData(data);
  }

  public loadAll(): void {
    const data = this.loadData();
    flags.fromJSON(JSON.stringify(data.flags ?? []));
    PlayerTechnologyManager.getInstance().fromJSON(JSON.stringify(data.unlockedBlockIds ?? []));
    if (data.settings) {
      PlayerSettingsManager.getInstance().fromJSON(data.settings);
    }
    if (data.passives) {
      PlayerPassiveManager.getInstance().fromJSON(JSON.stringify(data.passives));
    }
  }

  public changeSlot(newSlot: number): void {
    this.saveSlot = newSlot;
  }

  public static eraseSave(slot: number): void {
    const key = `save${slot}`;
    localStorage.removeItem(key);
    console.log(`Save slot ${slot} erased.`);
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

  public saveSettings(): void {
    const data = this.loadData();
    data.settings = PlayerSettingsManager.getInstance().toJSON();
    this.writeData(data);
  }

  public savePassives(): void {
    const data = this.loadData();
    data.passives = JSON.parse(PlayerPassiveManager.getInstance().toJSON());
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

  public loadSettings(): void {
    const data = this.loadData();
    if (data.settings) {
      PlayerSettingsManager.getInstance().fromJSON(data.settings);
    }
  }

  public loadPassives(): void {
    const data = this.loadData();
    if (data.passives) {
      PlayerPassiveManager.getInstance().fromJSON(JSON.stringify(data.passives));
    }
  }
}
