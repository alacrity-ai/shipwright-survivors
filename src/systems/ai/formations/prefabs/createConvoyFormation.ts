// src/systems/ai/formations/factories/createConvoyFormation.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

/**
 * Constructs a Convoy formation.
 * The leader is centered with symmetric escort ships in front and behind.
 * Ideal for protecting a vulnerable central unit in a linear column.
 */
export function createConvoyFormation(
  formationId: string,
  leaderShipId: string,
  followerShipIds: [string, string, string, string],
  leaderAffixes: ShipAffixes = {},
  followerAffixes: ShipAffixes = {},
  distance: number = 1000,
  count: number = 1,
  unCullable: boolean = false,
  leaderIsHunter: boolean = false
): ShipFormationEntry {
  const layout = [
    { x:  0, y: -2 }, // far front escort
    { x:  0, y: -1 }, // close front escort
    { x:  0, y: +1 }, // close rear escort
    { x:  0, y: +2 }  // far rear escort
  ].map(pos => ({
    x: pos.x * distance,
    y: pos.y * distance
  }));

  const followers = followerShipIds.map((shipId) => ({
    shipId,
    affixes: followerAffixes
  }));

  return {
    formationId,
    layout,
    leader: {
      shipId: leaderShipId,
      affixes: leaderAffixes,
      hunter: leaderIsHunter,
    },
    followers,
    count,
    unCullable,
  };
}
