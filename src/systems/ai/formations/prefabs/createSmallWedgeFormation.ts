// src/systems/ai/formations/factories/createSmallWedgeFormation.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';
import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

/**
 * Generates a compact wedge (triangle) formation with 1 leader and 2 wing followers.
 * The followers are positioned symmetrically behind and to the sides of the leader,
 * forming an equilateral triangle in local coordinate space.
 */
export function createSmallWedgeFormation(
  formationId: string,
  leaderShipId: string,
  followerShipIds: [string, string],
  leaderAffixes: ShipAffixes = {},
  followerAffixes: ShipAffixes = {},
  distance: number = 1000,
  count: number = 1,
  unCullable: boolean = false,
  leaderIsHunter: boolean = false,
  leaderBehaviorProfile?: BehaviorProfile,
  followerBehaviorProfile?: BehaviorProfile
): ShipFormationEntry {
  // Equilateral triangle, followers placed 60° behind and to the sides of the leader
  const layout = [
    { x: -0.866, y: +0.5 }, // Left wing follower (60° from leader)
    { x: +0.866, y: +0.5 }  // Right wing follower (120° from leader)
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
