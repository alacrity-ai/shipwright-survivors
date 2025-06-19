// src/systems/ai/formations/factories/createDiamondFormation.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

/**
 * Constructs a diamond-shaped formation centered on the leader,
 * with one follower on each cardinal axis (up, down, left, right).
 */
export function createDiamondFormation(
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
    { x:  0,        y: -1 }, // top
    { x: -1,        y:  0 }, // left
    { x:  1,        y:  0 }, // right
    { x:  0,        y:  1 }  // bottom
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
