// src/game/player/PlayerMissionManager.ts

import { SETTINGS } from '@/config/settings';

export class PlayerMissionManager {
  private globalBlockDropRate: number = SETTINGS.GLOBAL_BLOCK_DROP_RATE;

  // === Mission Settings ===

  public getGlobalBlockDropRate(): number {
    return this.globalBlockDropRate;
  }

  public setGlobalBlockDropRate(rate: number): void {
    this.globalBlockDropRate = rate;
  }

  public getBaseGlobalDropRate(): number {
    return SETTINGS.GLOBAL_BLOCK_DROP_RATE;
  }

  // === Lifecycle Management ===

  public reset(): void {
    this.globalBlockDropRate = SETTINGS.GLOBAL_BLOCK_DROP_RATE;
  }
}

// === Global singleton instance ===
export const missionSettings = new PlayerMissionManager();
