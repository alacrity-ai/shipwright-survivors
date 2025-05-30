// src/game/player/PlayerTechnologyManager.ts

import { getAllBlockTypes } from "@/game/blocks/BlockRegistry";

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
}
