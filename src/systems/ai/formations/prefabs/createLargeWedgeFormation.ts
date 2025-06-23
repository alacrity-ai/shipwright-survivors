// src/systems/ai/formations/factories/createLargeWedgeFormation.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';
import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

/**
 * Creates a large wedge with 1 leader and 6 followers,
 * in three equilateral rows behind the leader.
 */
export function createLargeWedgeFormation(
  formationId: string,
  leaderShipId: string,
  followerShipIds: [string, string, string, string, string, string],
  leaderAffixes: ShipAffixes = {},
  followerAffixes: ShipAffixes = {},
  distance: number = 1000,
  count: number = 1,
  unCullable: boolean = false,
  leaderIsHunter: boolean = false,
  leaderBehaviorProfile?: BehaviorProfile,
  followerBehaviorProfile?: BehaviorProfile
): ShipFormationEntry {
  const layout = [
    // Row 1
    { x: -0.866, y: +0.5 },
    { x: +0.866, y: +0.5 },
    // Row 2
    { x: -1.732, y: +1.5 },
    { x: +1.732, y: +1.5 },
    // Row 3
    { x: -2.598, y: +2.5 },
    { x: +2.598, y: +2.5 }
  ].map(pos => ({
    x: pos.x * distance,
    y: pos.y * distance
  }));

  const followers = followerShipIds.map((shipId) => ({
    shipId,
    affixes: followerAffixes,
    behaviorProfile: followerBehaviorProfile,
  }));

  return {
    formationId,
    layout,
    leader: {
      shipId: leaderShipId,
      affixes: leaderAffixes,
      hunter: leaderIsHunter,
      behaviorProfile: leaderBehaviorProfile,
    },
    followers,
    count,
    unCullable,
  };
}
