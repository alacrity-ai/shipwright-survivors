// src/systems/ai/formations/factories/createXFormation.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

/**
 * Constructs an X-shaped formation with the leader at the center
 * and four followers placed at the ends of the X arms.
 */
export function createXFormation(
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
  // Four diagonal arms: up-left, up-right, down-left, down-right
  const layout = [
    { x: -1, y: -1 }, // upper-left
    { x:  1, y: -1 }, // upper-right
    { x: -1, y:  1 }, // lower-left
    { x:  1, y:  1 }  // lower-right
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
