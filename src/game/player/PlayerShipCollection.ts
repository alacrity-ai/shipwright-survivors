// src/game/player/PlayerShipCollection.ts

import { ShipColorPreset } from '@/game/ship/utils/shipColorHelpers';

import type { CollectableShipDefinition } from '@/game/ship/interfaces/CollectableShipDefinition';

/**
 * Represents the persistent collection of starter ships the player has discovered or unlocked.
 * Ships must be discovered before they are eligible for unlocking via metacurrency.
 */
export class PlayerShipCollection {
  private static instance: PlayerShipCollection;

  private activeShip: CollectableShipDefinition | null = null;

  private discoveredShipNames: Set<string> = new Set();
  private unlockedShipNames: Set<string> = new Set();

  private selectedColor: ShipColorPreset = ShipColorPreset.White;

  private constructor() {}

  static getInstance(): PlayerShipCollection {
    if (!PlayerShipCollection.instance) {
      PlayerShipCollection.instance = new PlayerShipCollection();
    }
    return PlayerShipCollection.instance;
  }

  // === Active Ship Management ===

  setActiveShip(ship: CollectableShipDefinition): void {
    this.activeShip = ship;
  }

  getActiveShip(): CollectableShipDefinition | null {
    return this.activeShip;
  }

  getActiveShipFilepath(): string {
    const filepath = this.activeShip?.filepath;
    if (!filepath) return 'player/ship_00';
    return filepath;
  }

  // === Discover & Unlock ===

  discover(shipName: string): void {
    if (!this.discoveredShipNames.has(shipName)) {
      this.discoveredShipNames.add(shipName);
    }
  }

  unlock(shipName: string): void {
    if (!this.discoveredShipNames.has(shipName)) {
      console.warn(`[PlayerShipCollection] Tried to unlock undiscovered ship: ${shipName}`);
      return;
    }
    this.unlockedShipNames.add(shipName);
  }

  // === Accessors ===

  isDiscovered(shipName: string): boolean {
    return this.discoveredShipNames.has(shipName);
  }

  isUnlocked(shipName: string): boolean {
    return this.unlockedShipNames.has(shipName);
  }

  getDiscoveredShips(): string[] {
    return Array.from(this.discoveredShipNames);
  }

  getUnlockedShips(): string[] {
    return Array.from(this.unlockedShipNames);
  }

  // === Color Preference ===

  public setSelectedColor(color: ShipColorPreset): void {
    this.selectedColor = color;
  }

  public getSelectedColor(): ShipColorPreset {
    return this.selectedColor;
  }

  public cycleSelectedColor(direction: 1 | -1 = 1): void {
    const values = Object.values(ShipColorPreset);
    const currentIndex = values.indexOf(this.selectedColor);
    const nextIndex = (currentIndex + direction + values.length) % values.length;
    this.selectedColor = values[nextIndex] as ShipColorPreset;
  }

  // === Admin / Dev Cheats ===

  unlockAll(shipNames: string[]): void {
    shipNames.forEach(name => {
      this.discoveredShipNames.add(name);
      this.unlockedShipNames.add(name);
    });
  }

  reset(): void {
    this.discoveredShipNames.clear();
    this.unlockedShipNames.clear();
    this.selectedColor = ShipColorPreset.White;
  }

  destroy(): void {
    this.reset();
  }

  // === Serialization ===

  public toJSON(): string {
    return JSON.stringify({
      discovered: Array.from(this.discoveredShipNames),
      unlocked: Array.from(this.unlockedShipNames),
      selectedColor: this.selectedColor,
    });
  }

  public fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (
        parsed &&
        Array.isArray(parsed.discovered) &&
        Array.isArray(parsed.unlocked)
      ) {
        this.discoveredShipNames = new Set(parsed.discovered);
        this.unlockedShipNames = new Set(parsed.unlocked);

        if (
          typeof parsed.selectedColor === 'string' &&
          parsed.selectedColor in ShipColorPreset
        ) {
          this.selectedColor = parsed.selectedColor as ShipColorPreset;
        }
      } else {
        console.warn('[PlayerShipCollection] Malformed JSON input');
      }
    } catch (err) {
      console.warn('[PlayerShipCollection] Failed to parse JSON:', err);
    }
  }
}
