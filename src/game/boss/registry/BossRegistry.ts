// src/game/boss/registry/BossRegistry.ts

import type { BossDefinition } from '@/game/boss/interfaces/BossDefinition';

const BOSSES: Record<string, BossDefinition> = {
  flame_lord: {
    id: 'flame_lord',
    name: 'The Flame Lord',
    shipJsonPath: 'boss/boss_00.json', // resolves to /assets/ships/boss/boss_00.json
    initialState: 'Idle',              // placeholder for FSM
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
