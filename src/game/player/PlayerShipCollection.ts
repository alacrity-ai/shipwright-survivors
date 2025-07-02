// src/game/player/PlayerShipCollection.ts

import { ShipColorPreset } from '@/game/ship/utils/shipColorHelpers';
import type { ShipSkillEffectMetadata } from '@/game/ship/skills/interfaces/ShipSkillEffectMetadata';
import { getAggregatedSkillEffects } from '../ship/skills/runtime/UnlockedShipSkillTreeResolver';

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

  private static readonly MAX_MASTERY_LEVEL = 5;

  // XP required to go from level N to N+1
  private static getXpThresholdForLevel(level: number): number {
    return level * 100;
  }

  private shipMasteryMap: Map<string, { masteryLevel: number; experience: number }> = new Map();

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

  getSkillEffectsForActiveShip(): ShipSkillEffectMetadata {
    if (!this.activeShip) return {};
    return getAggregatedSkillEffects(this.activeShip.name);
  }

  getActiveShipFilepath(): string {
    const filepath = this.activeShip?.filepath;
    if (!filepath) return 'player/ship_00';
    return filepath;
  }

  // === Discover & Unlock ===

  discover(shipName: string): void {
    if (!this.discoveredShipNames.has(shipName)) {
      console.log(`[PlayerShipCollection] Discovered new ship: ${shipName}`);
      this.discoveredShipNames.add(shipName);
    }
  }

  unlock(shipName: string): void {
    if (!this.discoveredShipNames.has(shipName)) {
      console.warn(`[PlayerShipCollection] Tried to unlock undiscovered ship: ${shipName}`);
      return;
    }
    this.unlockedShipNames.add(shipName);

    // Initialize mastery if not present
    if (!this.shipMasteryMap.has(shipName)) {
      this.shipMasteryMap.set(shipName, { masteryLevel: 1, experience: 0 });
    }
  }

  // === Mastery Getters ===

  public getShipMasteryLevel(shipName: string): number {
    return this.shipMasteryMap.get(shipName)?.masteryLevel ?? 1;
  }

  public getShipExperience(shipName: string): number {
    return this.shipMasteryMap.get(shipName)?.experience ?? 0;
  }

  /**
   * Returns the XP threshold required to reach the next level from the specified level.
   * If the level is at or beyond the max, returns 0.
   */
  public getExperienceForLevel(level: number): number {
    if (level >= PlayerShipCollection.MAX_MASTERY_LEVEL) return 0;
    return PlayerShipCollection.getXpThresholdForLevel(level);
  }

  // === Mastery Mutators ===

  public addExperience(shipName: string, xp: number): void {
    if (!this.shipMasteryMap.has(shipName)) {
      this.shipMasteryMap.set(shipName, { masteryLevel: 1, experience: 0 });
    }

    const state = this.shipMasteryMap.get(shipName)!;
    if (state.masteryLevel >= PlayerShipCollection.MAX_MASTERY_LEVEL) return;

    state.experience += xp;

    while (
      state.masteryLevel < PlayerShipCollection.MAX_MASTERY_LEVEL &&
      state.experience >= PlayerShipCollection.getXpThresholdForLevel(state.masteryLevel)
    ) {
      state.experience -= PlayerShipCollection.getXpThresholdForLevel(state.masteryLevel);
      state.masteryLevel += 1;
    }
  }

  public levelUpShip(shipName: string): void {
    if (!this.shipMasteryMap.has(shipName)) {
      this.shipMasteryMap.set(shipName, { masteryLevel: 1, experience: 0 });
    }

    const state = this.shipMasteryMap.get(shipName)!;
    if (state.masteryLevel < PlayerShipCollection.MAX_MASTERY_LEVEL) {
      state.masteryLevel += 1;
      state.experience = 0;
    }
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
      mastery: Array.from(this.shipMasteryMap.entries()), // [['Vanguard', { masteryLevel: 2, experience: 180 }], ...]
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

        if (Array.isArray(parsed.mastery)) {
          this.shipMasteryMap = new Map(parsed.mastery);
        }
      } else {
        console.warn('[PlayerShipCollection] Malformed JSON input');
      }
    } catch (err) {
      console.warn('[PlayerShipCollection] Failed to parse JSON:', err);
    }
  }
}
