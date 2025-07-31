// src/game/boss/factories/BossFactory.ts

import type { BossSpawnContext } from '../interfaces/BossSpawnContext';
import type { Ship } from '@/game/ship/Ship';
import type { ShipFactory } from '@/game/ship/factories/ShipFactory';
import { BossAIController } from '../ai/BossAIController';

/**
 * Produces a fully hydrated boss ship using the shared ShipFactory,
 * and (eventually) wires it to a BossAIController.
 */
export class BossFactory {
  constructor(private readonly shipFactory: ShipFactory) {}

  public async create(context: BossSpawnContext): Promise<{
    ship: Ship;
    aiController: BossAIController | null;
  }> {
    const { definition, position } = context;

    const { ship } = await this.shipFactory.createShip(
      definition.shipJsonPath.replace(/\.json$/, ''), // Strip .json if present
      position.x,
      position.y,
      false,                    // hunter: off
      undefined,                // behaviorProfile: none
      {},                       // affixes: none for now
      undefined,                // faction: use default (Enemy)
      false,                    // registerController: legacy AI system — off
      true,                     // unCullable: ensure boss isn't GC'd
      false,                    // isPlayerShip: false
      false,                    // createInstantly: allow ship construction animation
      false                     // noClip: false (enable collisions)
    );

    // TODO: Attach BossAIController here
    // const aiController = new BossAIController(ship, definition.initialState);
    const aiController = null;

    return { ship, aiController };
  }
}
