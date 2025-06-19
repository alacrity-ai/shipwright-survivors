// src/systems/ai/formations/factories/createBoxFormation.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

/**
 * Constructs a box (square) formation with the leader at the center
 * and four followers placed at the square's corners.
 */
export function createBoxFormation(
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
    { x: -1, y: -1 }, // top-left
    { x:  1, y: -1 }, // top-right
    { x: -1, y:  1 }, // bottom-left
    { x:  1, y:  1 }  // bottom-right
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
