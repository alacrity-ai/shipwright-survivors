// src/game/player/helpers/ensureInitialUnlocks.ts

import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { PlayerAbilityManager } from '@/game/player/PlayerAbilityManager';
import { PlayerGlobalPassiveManager } from '../PlayerGlobalPassiveManager';
import { flags } from '@/game/player/PlayerFlagManager';

// Ensure the following:
// 1. Starter ship is unlocked and discovered
// 2. First mission is unlocked

export function ensureInitialUnlocks(): void {
  // Unlock the starter ship
  const playerShipCollection = PlayerShipCollection.getInstance();
  if (!playerShipCollection.isUnlocked('SW-1 Standard Issue')) {
    playerShipCollection.discover('SW-1 Standard Issue');
    playerShipCollection.unlock('SW-1 Standard Issue');
  }

  // Unlock the missions
  if (!flags.has('mission.mission_001.unlocked')) {
    flags.set('mission.mission_001.unlocked');
  }
  if (!flags.has('mission.mission_002.unlocked')) {
    flags.set('mission.mission_002.unlocked');
  }
  if (!flags.has('mission.mission_003_00.unlocked')) {
    flags.set('mission.mission_003_00.unlocked');
  }
  if (!flags.has('mission.mission_004_00.unlocked')) {
    flags.set('mission.mission_004_00.unlocked');
  }
  if (!flags.has('mission.mission_005_00.unlocked')) {
    flags.set('mission.mission_005_00.unlocked');
  }
  if (!flags.has('mission.mission_006_00.unlocked')) {
    flags.set('mission.mission_006_00.unlocked');
  }
  if (!flags.has('mission.intro-briefing.complete')) {
    flags.set('mission.intro-briefing.complete');
  }

  // Unlock all player abilities (previously spooled out via tutorialization)
  const playerAbilityManager = PlayerAbilityManager.getInstance();
  playerAbilityManager.unlockAll();

  // Unlock the initial node in the passive tree
  const playerGlobalPassiveManager = PlayerGlobalPassiveManager.getInstance();
  playerGlobalPassiveManager.unlockNode('root-node');
}
