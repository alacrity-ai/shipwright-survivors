// src/game/player/PlayerTechnologyManager.ts

import { getAllBlockTypes } from "@/game/blocks/BlockRegistry";
import { missionResultStore } from "@/game/missions/MissionResultStore";

export class PlayerTechnologyManager {
  private static instance: PlayerTechnologyManager;
  private unlockedBlockIds: Set<string> = new Set();

  private constructor() {}

  static getInstance(): PlayerTechnologyManager {
    if (!PlayerTechnologyManager.instance) {
      PlayerTechnologyManager.instance = new PlayerTechnologyManager();
    }
    return PlayerTechnologyManager.instance;
  }

  unlock(blockId: string): void {
    this.unlockedBlockIds.add(blockId);
    missionResultStore.addBlockUnlock(blockId);
  }

  unlockMany(blockIds: string[]): void {
    blockIds.forEach(id => this.unlockedBlockIds.add(id));
  }

  unlockAll(): void {
    const allIds = getAllBlockTypes().map(block => block.id);
    allIds.forEach(id => this.unlockedBlockIds.add(id));
  }

  isUnlocked(blockId: string): boolean {
    return this.unlockedBlockIds.has(blockId);
  }

  getUnlockedBlockIds(): string[] {
    return Array.from(this.unlockedBlockIds);
  }

  reset(): void {
    this.unlockedBlockIds.clear();
  }
  
  destroy(): void {
    this.unlockedBlockIds.clear();
  }

  // === Serialization ===

  public toJSON(): string {
    return JSON.stringify(Array.from(this.unlockedBlockIds));
  }

  public fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        this.unlockedBlockIds = new Set(parsed);
      }
    } catch (err) {
      console.warn('Failed to load player technology from JSON:', err);
    }
  }
}
