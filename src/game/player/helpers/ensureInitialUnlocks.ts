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

  // Unlock the first two missions
  if (!flags.has('mission.mission_001.unlocked')) {
    flags.set('mission.mission_001.unlocked');
  }
  if (!flags.has('mission.mission_002.unlocked')) {
    flags.set('mission.mission_002.unlocked');
  }

  // Unlock all player abilities (previously spooled out via tutorialization)
  const playerAbilityManager = PlayerAbilityManager.getInstance();
  playerAbilityManager.unlockAll();

  // Unlock the initial node in the passive tree
  const playerGlobalPassiveManager = PlayerGlobalPassiveManager.getInstance();
  playerGlobalPassiveManager.unlockNode('root-node');
}
