// src/systems/ai/formations/factories/createHourGlassFormation.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';
import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

/**
 * Generates a scalable hourglass-shaped formation centered around the leader.
 */
export function createHourGlassFormation(
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
    { x: -distance, y: -distance },     // F0 - upper left
    { x: +distance, y: -distance },     // F1 - upper right
    { x: 0,         y: -2 * distance }, // F2 - top center
    { x: -distance, y: +distance },     // F3 - lower left
    { x: +distance, y: +distance },     // F4 - lower right
    { x: 0,         y: +2 * distance }  // F5 - bottom center
  ];

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
      hunter: leaderIsHunter,
      affixes: leaderAffixes,
      behaviorProfile: leaderBehaviorProfile,
    },
    followers,
    count,
    unCullable,
  };
}
