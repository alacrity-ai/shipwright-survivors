// src/systems/ai/formations/factories/createArrowHeadFormation.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';
import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

/**
 * Constructs an arrowhead formation with the leader at the front
 * and four followers arranged in a V-shape behind it.
 */
export function createArrowHeadFormation(
  formationId: string,
  leaderShipId: string,
  followerShipIds: [string, string, string, string],
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
    { x: -2, y: +1 }, // far left wing
    { x: -1, y: +0.5 }, // inner left
    { x:  1, y: +0.5 }, // inner right
    { x:  2, y: +1 }  // far right wing
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
