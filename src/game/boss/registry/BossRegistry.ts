// src/game/boss/registry/BossRegistry.ts

import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';

const BOSSES: Record<string, BossDefinition> = {
  flame_lord: {
    id: 'flame_lord',
    name: 'Crazy Moe',
    subtitle: 'The Barbecue Baron',
    shipJsonPath: 'boss/flamelord.json',
    initialState: 'Idle',
    maxHealth: 200000,
    maxHealthDamageIntakePerSecond: 6000,
    damageMultiplier: 1.0,
  },
};

export class BossRegistry {
  public static get(id: string): BossDefinition {
    const def = BOSSES[id];
    if (!def) throw new Error(`[BossRegistry] No boss found with id '${id}'`);
    return def;
  }

  public static getAll(): BossDefinition[] {
    return Object.values(BOSSES);
  }
}
