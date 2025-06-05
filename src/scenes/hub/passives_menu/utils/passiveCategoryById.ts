// src/scenes/hub/passives_menu/utils/passiveCategoryById.ts

import type { PassiveId } from '@/game/player/PlayerPassiveManager';
import type { PassiveCategory } from '@/scenes/hub/passives_menu/types/Passives';
import { PassiveMetadata } from '@/scenes/hub/passives_menu/types/Passives';

export const PassiveCategoryById: Record<PassiveId, PassiveCategory> = (() => {
  const map: Record<PassiveId, PassiveCategory> = {} as any;

  for (const id in PassiveMetadata) {
    const category = PassiveMetadata[id as PassiveId].category;
    map[id as PassiveId] = category;
  }

  return map;
})();
