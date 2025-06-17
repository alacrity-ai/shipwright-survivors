import { flags } from '@/game/player/PlayerFlagManager';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { PlayerPassiveManager } from '@/game/player/PlayerPassiveManager';
import { PlayerMetaCurrencyManager } from '@/game/player/PlayerMetaCurrencyManager';

export interface SaveGameData {
  flags: string[];
  unlockedBlockIds: string[];
  settings?: string; // JSON stringified settings blob
  passives?: any;
  metaCurrency?: any;
  version?: number;
}

const LAST_SAVE_SLOT_KEY = 'lastSaveSlot';

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
      metaCurrency: JSON.parse(PlayerMetaCurrencyManager.getInstance().toJSON()),
      version: 1
    };

    this.writeData(data);

    // Update last save slot index
    localStorage.setItem(LAST_SAVE_SLOT_KEY, String(this.saveSlot));
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
    if (data.metaCurrency) {
      PlayerMetaCurrencyManager.getInstance().fromJSON(JSON.stringify(data.metaCurrency));
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

  public static getFirstAvailableResolution(): { width: number; height: number } {
    const DEFAULT_RESOLUTION = { width: 1920, height: 1080 };
    const lastSlot = SaveGameManager.getLastSaveSlot();

    if (lastSlot !== null) {
      const key = `save${lastSlot}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const data = JSON.parse(raw) as SaveGameData;
          if (data.settings) {
            const settings = JSON.parse(data.settings);
            const width = parseInt(settings.viewportWidth);
            const height = parseInt(settings.viewportHeight);
            if (
              Number.isFinite(width) && width > 0 &&
              Number.isFinite(height) && height > 0
            ) {
              return { width, height };
            }
          }
        } catch (e) {
          console.warn(`Failed to parse save data from last slot ${lastSlot}:`, e);
        }
      }
    }

    return DEFAULT_RESOLUTION;
  }

  public static getLastSaveSlot(): number | null {
    const raw = localStorage.getItem(LAST_SAVE_SLOT_KEY);
    const parsed = parseInt(raw ?? '', 10);
    return Number.isInteger(parsed) ? parsed : null;
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

  public saveMetaCurrency(): void {
    const data = this.loadData();
    data.metaCurrency = JSON.parse(PlayerMetaCurrencyManager.getInstance().toJSON());
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

  public loadMetaCurrency(): void {
    const data = this.loadData();
    if (data.metaCurrency) {
      PlayerMetaCurrencyManager.getInstance().fromJSON(JSON.stringify(data.metaCurrency));
    }
  }
}
