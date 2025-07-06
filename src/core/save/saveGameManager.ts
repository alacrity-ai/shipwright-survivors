// src/core/save/saveGameManager.ts

import { flags } from '@/game/player/PlayerFlagManager';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { PlayerPassiveManager } from '@/game/player/PlayerPassiveManager';
import { PlayerMetaCurrencyManager } from '@/game/player/PlayerMetaCurrencyManager';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { PlayerShipSkillTreeManager } from '@/game/player/PlayerShipSkillTreeManager';

export interface SaveGameData {
  flags: string[];
  unlockedBlockIds: string[];
  // settings?: string; // Deprecated — settings are now stored globally
  passives?: any;
  metaCurrency?: any;
  version?: number;
  ships?: string;
  shipSkillTrees?: string;
}

const LAST_SAVE_SLOT_KEY = 'lastSaveSlot';
const PLAYER_SETTINGS_KEY = 'playerSettings';

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
      passives: JSON.parse(PlayerPassiveManager.getInstance().toJSON()),
      metaCurrency: JSON.parse(PlayerMetaCurrencyManager.getInstance().toJSON()),
      ships: PlayerShipCollection.getInstance().toJSON(),
      shipSkillTrees: PlayerShipSkillTreeManager.getInstance().toJSON(),
      version: 1,
    };

    this.writeData(data);
    SaveGameManager.saveSettings();
    localStorage.setItem(LAST_SAVE_SLOT_KEY, String(this.saveSlot));
  }

  public loadAll(): void {
    const data = this.loadData();
    flags.fromJSON(JSON.stringify(data.flags ?? []));
    PlayerTechnologyManager.getInstance().fromJSON(JSON.stringify(data.unlockedBlockIds ?? []));
    SaveGameManager.loadSettings();
    if (data.passives) {
      PlayerPassiveManager.getInstance().fromJSON(JSON.stringify(data.passives));
    }
    if (data.metaCurrency) {
      PlayerMetaCurrencyManager.getInstance().fromJSON(JSON.stringify(data.metaCurrency));
    }
    if (data.ships) {
      PlayerShipCollection.getInstance().fromJSON(data.ships);
    }
    if (data.shipSkillTrees) {
      PlayerShipSkillTreeManager.getInstance().fromJSON(data.shipSkillTrees);
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
    const raw = localStorage.getItem(PLAYER_SETTINGS_KEY);
    if (raw) {
      try {
        const settings = JSON.parse(raw);
        const width = parseInt(settings.viewportWidth);
        const height = parseInt(settings.viewportHeight);
        if (
          Number.isFinite(width) && width > 0 &&
          Number.isFinite(height) && height > 0
        ) {
          return { width, height };
        }
      } catch (e) {
        console.warn(`Failed to parse global settings:`, e);
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

  public static saveSettings(): void {
    const settings = PlayerSettingsManager.getInstance().toJSON();
    localStorage.setItem(PLAYER_SETTINGS_KEY, settings);
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

  public saveShips(): void {
    const data = this.loadData();
    data.ships = PlayerShipCollection.getInstance().toJSON();
    this.writeData(data);
  }

  public saveShipSkillTrees(): void {
    const data = this.loadData();
    data.shipSkillTrees = PlayerShipSkillTreeManager.getInstance().toJSON();
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

  public static loadSettings(): void {
    const raw = localStorage.getItem(PLAYER_SETTINGS_KEY);
    if (raw) {
      PlayerSettingsManager.getInstance().fromJSON(raw);
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

  public loadShips(): void {
    const data = this.loadData();
    if (data.ships) {
      PlayerShipCollection.getInstance().fromJSON(data.ships);
    }
  }

  public loadShipSkillTrees(): void {
    const data = this.loadData();
    if (data.shipSkillTrees) {
      PlayerShipSkillTreeManager.getInstance().fromJSON(data.shipSkillTrees);
    }
  }

  // === GLOBAL SETTINGS UTILITY ===

  public static clearSettings(): void {
    localStorage.removeItem(PLAYER_SETTINGS_KEY);
  }
}
