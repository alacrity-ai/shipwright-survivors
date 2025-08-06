// src/game/player/helpers/playerResetService.ts

/**
 * Resets all player data to initial state.
 * Useful for when returning to the main menu, as we don't want data from one save file to leak into another.
*/

import { PlayerAbilityManager } from '@/game/player/PlayerAbilityManager';
import { PlayerArtifactsManager } from '@/game/player/PlayerArtifactsManager';
import { PlayerExperienceManager } from '@/game/player/PlayerExperienceManager';
import { flags } from '@/game/player/PlayerFlagManager';
import { PlayerPassiveManager } from '@/game/player/PlayerPassiveManager';
import { PlayerPowerupManager } from '@/game/player/PlayerPowerupManager';
import { PlayerQuestManager } from '@/game/player/PlayerQuestManager';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { PlayerShipSkillTreeManager } from '@/game/player/PlayerShipSkillTreeManager';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';
import { PlayerTradePostManager } from '@/game/player/PlayerTradePostManager';
import { PlayerMetaCurrencyManager } from '@/game/player/PlayerMetaCurrencyManager';

export function resetPlayerData(): void {
  PlayerAbilityManager.getInstance().reset();
  PlayerArtifactsManager.getInstance().reset();
  PlayerExperienceManager.getInstance().reset();
  flags.clear();
  PlayerPassiveManager.getInstance().clear();
  PlayerPowerupManager.destroy();
  PlayerQuestManager.getInstance().reset();
  PlayerShipCollection.getInstance().reset();
  PlayerShipSkillTreeManager.destroy();
  PlayerTechnologyManager.getInstance().reset();
  PlayerTradePostManager.getInstance().reset();
  PlayerMetaCurrencyManager.getInstance().reset();
}
