// src/systems/helpers/purgeNonPlayerShips.ts

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { destroyEntityExternally } from '@/core/interfaces/events/EntityReporter';
import { Faction } from '@/game/interfaces/types/Faction';

/**
 * Destroys every non-player, non-persistent ship in the world
 * that shares the player's faction.
 *
 * Used after large displacements like teleporting or jumping sectors.
 *
 * @returns the number of ships culled
 */
export function purgeNonPlayerShips(): number {
  const registry = ShipRegistry.getInstance();
  const player   = registry.getPlayerShip();
  if (!player) return 0;

  let destroyed = 0;

  for (const ship of registry.getAll()) {
    if (ship.getIsPlayerShip()) continue;
    if (ship.getFaction() === Faction.Player) continue;
    if (ship.hasTag?.('persistent') || ship.hasTag?.('boss')) continue;

    ship.setDestructionCause('replaced');
    destroyEntityExternally(ship, 'replaced');
    destroyed++;
  }

  return destroyed;
}
