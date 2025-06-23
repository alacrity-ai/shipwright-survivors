// src/systems/ai/formations/factories/createWingedColumnFormation.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';
import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';

/**
 * Constructs a Winged Column formation.
 * Leader is at the front of a central vertical column,
 * with wings staggered on the flanks for lateral support.
 */
export function createWingedColumnFormation(
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
    { x:  0, y: +1 },  // center mid
    { x:  0, y: +2 },  // center rear

    { x: -1, y: +0.5 }, // upper-left wing
    { x:  1, y: +0.5 }, // upper-right wing

    { x: -1, y: +1.5 }, // lower-left wing
    { x:  1, y: +1.5 }  // lower-right wing
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
