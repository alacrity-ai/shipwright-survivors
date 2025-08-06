// src/game/player/PlayerShipCollection.ts

import { ShipColorPreset } from '@/game/ship/utils/shipColorHelpers';

import type { ShipSkillEffectMetadata } from '@/game/ship/skills/interfaces/ShipSkillEffectMetadata';
import type { ArtifactEffectMetadata } from '@/game/ship/artifacts/interfaces/ArtifactEffectMetadata';

import { getAggregatedSkillEffects } from '../ship/skills/runtime/UnlockedShipSkillTreeResolver';
import { getAggregatedArtifactEffects } from '../ship/artifacts/runtime/ArtifactEffectResolver';
import { ShipBlueprintRegistry } from '@/game/ship/ShipBlueprintRegistry';

import type { CollectableShipDefinition } from '@/game/ship/interfaces/CollectableShipDefinition';

const levelExpArr = [
  100,
  200,
  300,
  400,
  500,
  600,
]

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
    return levelExpArr[level] ?? 100;
  }

  private shipMasteryMap: Map<string, { masteryLevel: number; experience: number }> = new Map();

  private selectedColor: ShipColorPreset = ShipColorPreset.White;

  private cachedSkillEffects: Record<string, ShipSkillEffectMetadata> = {};
  private cachedArtifactEffects: Record<string, ArtifactEffectMetadata> = {};
  private cachedTotalModifiers: Record<string, ShipSkillEffectMetadata & ArtifactEffectMetadata> = {};

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
    this.clearCachedModifiers();
  }

  getActiveShip(): CollectableShipDefinition | null {
    return this.activeShip;
  }

  getActiveShipFilepath(): string {
    const filepath = this.activeShip?.filepath;
    if (!filepath) return 'player/ship_00';
    return filepath;
  }

  // === Artifact and Skill tree handling (Cached)
  // Must be cleared when equipping/unequipping or entering missiones

  public clearCachedModifiers(): void {
    this.cachedSkillEffects = {};
    this.cachedArtifactEffects = {};
    this.cachedTotalModifiers = {};
  }

  public getSkillEffectsForActiveShip(): ShipSkillEffectMetadata {
    const id = this.activeShip?.name;
    if (!id) return {};

    if (!this.cachedSkillEffects[id]) {
      this.cachedSkillEffects[id] = getAggregatedSkillEffects(id);
    }
    return this.cachedSkillEffects[id];
  }

  public getArtifactEffectsForActiveShip(): ArtifactEffectMetadata {
    const id = this.activeShip?.name;
    if (!id) return {};

    if (!this.cachedArtifactEffects[id]) {
      this.cachedArtifactEffects[id] = getAggregatedArtifactEffects(id);
    }
    return this.cachedArtifactEffects[id];
  }

  public getTotalModifiersForActiveShip(): ArtifactEffectMetadata & ShipSkillEffectMetadata {
    const id = this.activeShip?.name;
    if (!id) return {};

    if (!this.cachedTotalModifiers[id]) {
      this.cachedTotalModifiers[id] = {
        ...this.getSkillEffectsForActiveShip(),
        ...this.getArtifactEffectsForActiveShip(),
      };
    }
    return this.cachedTotalModifiers[id];
  }
  
  // === Discover & Unlock ===

  discover(shipName: string): void {
    if (!this.discoveredShipNames.has(shipName)) {
      this.discoveredShipNames.add(shipName);
    }

    this.unlock(shipName);
  }

  unlock(shipName: string): void {
    if (!this.discoveredShipNames.has(shipName)) {
      console.warn(`[PlayerShipCollection] Tried to unlock undiscovered ship: ${shipName}`);
      return;
    }
    this.unlockedShipNames.add(shipName);

    // Initialize mastery if not present
    if (!this.shipMasteryMap.has(shipName)) {
      this.shipMasteryMap.set(shipName, { masteryLevel: 0, experience: 0 });
    }
  }

  unDiscover(shipName: string): void {
    this.discoveredShipNames.delete(shipName);
    this.unlockedShipNames.delete(shipName);
    this.shipMasteryMap.delete(shipName);
  }

  // Testing

  unlockAndDiscoverAll(): void {
    const allShips = ShipBlueprintRegistry.getAllShipLongNames();
    allShips.forEach(name => this.discover(name));
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
      this.shipMasteryMap.set(shipName, { masteryLevel: 0, experience: 0 });
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
      this.shipMasteryMap.set(shipName, { masteryLevel: 0, experience: 0 });
    }

    const state = this.shipMasteryMap.get(shipName)!;
    if (state.masteryLevel < PlayerShipCollection.MAX_MASTERY_LEVEL) {
      state.masteryLevel += 1;
      state.experience = 0;
    }
  }

  public masterAllShips(): void {
    for (const shipName of this.discoveredShipNames) {
      this.shipMasteryMap.set(shipName, {
        masteryLevel: PlayerShipCollection.MAX_MASTERY_LEVEL,
        experience: 0,
      });
    }
  }

  // === Accessors ===

  // Should be the canonical check for most systems
  isUnlockedById(shipId: string): boolean {
    const shipName = ShipBlueprintRegistry.getByName(shipId)?.name;
    if (!shipName) return false;
    return this.isUnlocked(shipName);
  }

  // This should be the canonical unlock point for most systems
  // Note that discovery is deprecated, but still required, so we will discover and unlock in one action
  unlockById(shipId: string): void {
    const shipName = ShipBlueprintRegistry.getByName(shipId)?.name;
    if (!shipName) return;
    this.discover(shipName);
    this.unlock(shipName);
  }

  /** Return registry keys (ids) for all unlocked ships. */
  getUnlockedShipIds(): string[] {
    return ShipBlueprintRegistry.getAllShipKeys().filter(id => {
      const def = ShipBlueprintRegistry.getByName(id);
      if (!def) return false;                   // defensive: unknown id
      return this.isUnlocked(def.name);         // compare against display-name set
    });
  }

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
    this.clearCachedModifiers();
  }

  public destroy(): void {
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
