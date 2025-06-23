// src/systems/ai/formations/factories/createLineFormation.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';
import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

/**
 * Constructs a horizontal line formation (line abreast),
 * with the leader at the center and three followers on each side.
 */
export function createLineFormation(
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
    { x: -3, y: 0 }, // far left
    { x: -2, y: 0 }, // mid-left
    { x: -1, y: 0 }, // inner left
    { x:  1, y: 0 }, // inner right
    { x:  2, y: 0 }, // mid-right
    { x:  3, y: 0 }  // far right
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
