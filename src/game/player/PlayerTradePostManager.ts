// src/game/player/PlayerTradePostManager.ts

import type { TradePostInstance } from '@/game/tradepost/interfaces/TradePostInstance';
import { createTradePostInstance } from '@/game/tradepost/helpers/createTradePostInstance';

export class PlayerTradePostManager {
  private static instance: PlayerTradePostManager;

  private tradePostInstances: Map<string, TradePostInstance> = new Map();

  private constructor() {}

  public static getInstance(): PlayerTradePostManager {
    if (!PlayerTradePostManager.instance) {
      PlayerTradePostManager.instance = new PlayerTradePostManager();
    }
    return PlayerTradePostManager.instance;
  }

  public hasInstance(id: string): boolean {
    return this.tradePostInstances.has(id);
  }

  public getInstanceById(id: string): TradePostInstance | undefined {
    return this.tradePostInstances.get(id);
  }

  public setInstanceById(id: string, instance: TradePostInstance): void {
    this.tradePostInstances.set(id, instance);
  }

  public reset(): void {
    this.tradePostInstances.clear();
  }

  public toJSON(): string {
    return JSON.stringify(
      [...this.tradePostInstances.entries()].map(([id, instance]) => ({
        id,
        definition: instance.getOriginalDefinition()
      }))
    );
  }

  public fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) return;

      for (const { id, definition } of parsed) {
        const inst = createTradePostInstance(definition);
        this.setInstanceById(id, inst);
      }
    } catch (e) {
      console.warn('[TradePostManager] Failed to parse saved data:', e);
    }
  }
}
