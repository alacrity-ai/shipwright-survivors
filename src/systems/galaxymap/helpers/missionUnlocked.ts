// src/systems/galaxymap/helpers/missionUnlocked.ts

import { missionLoader } from '@/game/missions/MissionLoader';
import { flags } from '@/game/player/PlayerFlagManager';

export function missionUnlocked(missionId: string): boolean {
  const missionDefinition = missionLoader.getMissionById(missionId);
  if (!missionDefinition) return false;
  return flags.has(missionDefinition.requiredFlag ?? null);
}
