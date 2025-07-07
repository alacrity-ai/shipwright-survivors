// src/player/PlayerArtifactsManager.ts

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

/**
 * Singleton responsible for managing:
 * - Artifact unlocks (globally)
 * - Equipped artifacts per ship (keyed by shipName)
 */
export class PlayerArtifactsManager {
  private static instance: PlayerArtifactsManager;

  // === Artifact Unlock Tracking ===
  private unlockedArtifacts: Set<string> = new Set();

  /**
   * Mapping of shipName → [artifactId?, artifactId?]
   * Each ship may equip up to 2 artifacts, indexed as [0, 1]
   */
  private equippedArtifactsByShipName: Map<string, [string?, string?, string?]> = new Map();

  private constructor() {}

  public static getInstance(): PlayerArtifactsManager {
    if (!PlayerArtifactsManager.instance) {
      PlayerArtifactsManager.instance = new PlayerArtifactsManager();
    }
    return PlayerArtifactsManager.instance;
  }

  // === Unlocks ===

  public unlockArtifact(artifactId: string): void {
    this.unlockedArtifacts.add(artifactId);
  }

  public isUnlocked(artifactId: string): boolean {
    return this.unlockedArtifacts.has(artifactId);
  }

  public getUnlockedArtifacts(): string[] {
    return Array.from(this.unlockedArtifacts);
  }

  // === Equip/Unequip ===

  public equipArtifact(shipName: string, slotIndex: 0 | 1 | 2, artifactId: string): void {
    if (!this.unlockedArtifacts.has(artifactId)) {
      console.warn(`[PlayerArtifactsManager] Tried to equip locked artifact: ${artifactId}`);
      return;
    }

    const current = this.equippedArtifactsByShipName.get(shipName) || [undefined, undefined, undefined];
    current[slotIndex] = artifactId;
    this.equippedArtifactsByShipName.set(shipName, current);
  }

  public unequipArtifact(shipName: string, slotIndex: 0 | 1 | 2): void {
    const current = this.equippedArtifactsByShipName.get(shipName);
    if (!current) return;
    current[slotIndex] = undefined;
    this.equippedArtifactsByShipName.set(shipName, current);
  }

  public getEquippedArtifacts(shipName: string): [string?, string?, string?] {
    return this.equippedArtifactsByShipName.get(shipName) ?? [undefined, undefined, undefined];
  }

  /**
   * Returns the ship name if the artifact is equipped on any ship.
   */
  public findEquippedShipForArtifact(artifactId: string): string | null {
    for (const [shipName, slots] of this.equippedArtifactsByShipName.entries()) {
      if (slots.includes(artifactId)) {
        return shipName;
      }
    }
    return null;
  }

  // === Resets & Dev Utilities ===

  public reset(): void {
    this.unlockedArtifacts.clear();
    this.equippedArtifactsByShipName.clear();
  }

  public destroy(): void {
    this.reset();
  }

  public unlockAll(artifactIds: string[]): void {
    artifactIds.forEach(id => this.unlockedArtifacts.add(id));
  }

  // === Serialization ===

  public toJSON(): string {
    return JSON.stringify({
      unlocked: Array.from(this.unlockedArtifacts),
      equipped: Array.from(this.equippedArtifactsByShipName.entries()),
    });
  }

  public fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (parsed) {
        if (Array.isArray(parsed.unlocked)) {
          this.unlockedArtifacts = new Set(parsed.unlocked);
        }

        if (Array.isArray(parsed.equipped)) {
          this.equippedArtifactsByShipName = new Map(parsed.equipped);
        }
      } else {
        console.warn('[PlayerArtifactsManager] Malformed JSON input');
      }
    } catch (err) {
      console.warn('[PlayerArtifactsManager] Failed to parse JSON:', err);
    }
  }
}
