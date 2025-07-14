// src/game/quests/helpers/emitOnSlainQuestSteps.ts
import type { Ship } from '@/game/ship/Ship';
import type { QuestStepId } from '@/game/quests/interfaces/QuestStep';

import { reportQuestStepUpdated } from '@/core/interfaces/events/QuestReporter';


/** Declarative mapping → stepId, increment or value */
interface SlayerMapping {
  /** Tag predicate (plain string or RegExp for flexibility). */
  tag: string | RegExp;
  /** QuestStep.kind to update.                       */
  stepId: QuestStepId;
  /** Numeric increment, boolean OR, or literal string. */
  value: number | boolean | string;
}

/*───────────────────────────────────────────────────────────*
 *  MASTER TABLE  — compiler-checked
 *───────────────────────────────────────────────────────────*/
export const MAPPINGS = [
  { tag: /ship_0_station/i,   stepId: 'spaceStationsSlain',  value: 1 },
  { tag: /tier3_station_00/i, stepId: 'spaceStations2Slain', value: 1 },
  { tag: /tier2_sieger_00/i, stepId: 'brawlersSlain', value: 1 },
  // { tag: 'boss_behemothPrime', stepId: 'bossSlain', value: 'behemothPrime' },
] as const satisfies readonly SlayerMapping[];


/*───────────────────────────────────────────────────────────*/
export function emitOnSlainQuestSteps(ship: Ship): void {
  for (const { tag, stepId, value } of MAPPINGS) {
    const matched =
      typeof tag === 'string'
        ? ship.hasTag(tag)
        : Array.from(ship.getTags()).some(t => tag.test(t));

    if (matched) {
      reportQuestStepUpdated(stepId, value);
    }
  }
}
