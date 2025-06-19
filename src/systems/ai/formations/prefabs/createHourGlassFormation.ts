// src/systems/ai/formations/factories/createHourGlassFormation.ts

import type { ShipFormationEntry } from '@/game/waves/types/WaveDefinition';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';

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
  leaderIsHunter: boolean = false
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
    affixes: followerAffixes
  }));

  return {
    formationId,
    layout,
    leader: {
      shipId: leaderShipId,
      hunter: leaderIsHunter,
      affixes: leaderAffixes
    },
    followers,
    count,
    unCullable,
  };
}
