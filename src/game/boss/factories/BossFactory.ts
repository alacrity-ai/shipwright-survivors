// src/game/boss/factories/BossFactory.ts

import type { BossSpawnContext } from '../interfaces/BossSpawnContext';
import type { Ship } from '@/game/ship/Ship';
import type { ShipFactory } from '@/game/ship/factories/ShipFactory';
import type { CombatService } from '@/systems/combat/CombatService';

import { FlameLordController } from '../ai/bosses/flamelord/FlameLordController';
import type { BaseBossAIController } from '../ai/bosses/BaseBossAIController';
import type { BossDefinition } from '../interfaces/BossDefinition';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

/**
 * Produces a fully hydrated boss ship using the shared ShipFactory,
 * and wires it to its respective FSM AI controller.
 */
export class BossFactory {
  constructor(private readonly shipFactory: ShipFactory) {}

  public async create(context: BossSpawnContext): Promise<{
    ship: Ship;
    aiController: BaseBossAIController | null;
  }> {
    const { definition, position } = context;

    const { ship } = await this.shipFactory.createShip(
      definition.shipJsonPath.replace(/\.json$/, ''), // Strip .json if present
      position.x,
      position.y,
      false,       // hunter: off
      undefined,   // behaviorProfile: none
      {},          // affixes: none
      undefined,   // faction: default (Enemy)
      false,       // registerController: off
      true,        // unCullable
      false,       // isPlayerShip: false
      false,       // createInstantly
      false,       // noClip
      ['alwaysAnimateBuild', 'persistent', 'boss']
    );

    // Set affixes for no block drops or entropium drops
    ship.setAffixes({ blockDropRateMulti: 0.0, entropiumDropRateMulti: 0.0 });
    ship.initializeHealth(definition.maxHealth);
    ship.setMaxHealthDamageIntakePerSecond(definition.maxHealthDamageIntakePerSecond);

    const player = ShipRegistry.getInstance().getPlayerShip();
    if (!player) throw new Error('[BossFactory] Player ship not found in registry');

    const combatService = this.shipFactory.getCombatService();
    const aiController = createAIController(definition, ship, player, combatService, definition);

    return { ship, aiController };
  }
}

/**
 * Delegates instantiation to the appropriate boss-specific AI controller.
 */
function createAIController(
  def: BossDefinition,
  boss: Ship,
  player: Ship,
  combatService: CombatService,
  bossDefinition: BossDefinition
): BaseBossAIController | null {
  switch (def.id) {
    case 'flame_lord':
      return new FlameLordController(boss, player, def.initialState, combatService, bossDefinition);

    // case 'other_boss':
    //   return new OtherBossController(boss, player, def.initialState);

    default:
      console.warn(`[BossFactory] No AI controller registered for boss: '${def.id}'`);
      return null;
  }
}
