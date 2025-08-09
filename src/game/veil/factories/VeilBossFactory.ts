// src/game/veil/factories/VeilBossFactory.ts

import type { Ship } from '@/game/ship/Ship';
import type { ShipFactory } from '@/game/ship/factories/ShipFactory';
import type { BossOptions } from '@/game/veil/interfaces/BossOptions';

// Import default behavior profile
import { SiegeBehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

export interface VeilBossSpawnContext {
  bossOptions: BossOptions;
  position: { x: number; y: number };
}

/**
 * Creates "veil bosses" — essentially standard ships defined by JSON,
 * spawned in the context of a veil encounter.
 */
export class VeilBossFactory {
  constructor(private readonly shipFactory: ShipFactory) {}

  public async create(context: VeilBossSpawnContext): Promise<Ship> {
    const { bossOptions, position } = context;
    const { bossId } = bossOptions;

    if (!bossId) {
      throw new Error('[VeilBossFactory] bossId is required');
    }

    const { ship } = await this.shipFactory.createShip(
      bossId.replace(/\.json$/, ''), // strip .json if present
      position.x,
      position.y,
      true,      // hunter
      SiegeBehaviorProfile,  // behaviorProfile
      {},         // affixes
      undefined,  // faction: default (Enemy)
      true,      // registerController
      true,       // unCullable
      false,      // isPlayerShip
      false       // noClip
    );

    ship.addTag('persistent');

    return ship;
  }
}
