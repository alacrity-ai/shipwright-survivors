// src/game/player/helpers/ensureInitialUnlocks.ts

import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { PlayerAbilityManager } from '@/game/player/PlayerAbilityManager';
import { flags } from '@/game/player/PlayerFlagManager';

// Ensure the following:
// 1. Starter ship is unlocked and discovered
// 2. First mission is unlocked

export function ensureInitialUnlocks(): void {
  const playerShipCollection = PlayerShipCollection.getInstance();
  if (!playerShipCollection.isUnlocked('SW-1 Standard Issue')) {
    playerShipCollection.discover('SW-1 Standard Issue');
    playerShipCollection.unlock('SW-1 Standard Issue');
  }

  if (!flags.has('mission.mission_001.unlocked')) {
    flags.set('mission.mission_001.unlocked');
  }

  if (!flags.has('mission.mission_002.unlocked')) {
    flags.set('mission.mission_002.unlocked');
  }

  const playerAbilityManager = PlayerAbilityManager.getInstance();
  playerAbilityManager.unlockAll();
}
