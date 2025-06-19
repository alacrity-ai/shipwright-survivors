// src/systems/ai/formations/factories/createPhalanxFormation.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

/**
 * Constructs a Phalanx formation: leader at the front-center,
 * with six followers in a 2x3 grid behind, forming a dense block.
 */
export function createPhalanxFormation(
  formationId: string,
  leaderShipId: string,
  followerShipIds: [string, string, string, string, string, string],
  leaderAffixes: ShipAffixes = {},
  followerAffixes: ShipAffixes = {},
  distance: number = 1000,
  count: number = 1,
  unCullable: boolean = false,
  leaderIsHunter: boolean = false
): ShipFormationEntry {
  const layout = [
    { x: -1, y: +1 },  // row 1, left
    { x:  0, y: +1 },  // row 1, center
    { x: +1, y: +1 },  // row 1, right
    { x: -1, y: +2 },  // row 2, left
    { x:  0, y: +2 },  // row 2, center
    { x: +1, y: +2 }   // row 2, right
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
