// ─────────────────────────────────────────────────────────────────────────
//  @/game/quests/registry/QuestRegistry.ts
//  • Aggregates quest definition modules into a single immutable registry.
// ─────────────────────────────────────────────────────────────────────────

import type { Quest } from '@/game/quests/interfaces/Quest';

import { mission1Quests } from './definitions/mission1Quests';
import { mission2Quests } from './definitions/mission2Quests';
import { mission3Quests } from './definitions/mission3Quests';
import { mission4Quests } from './definitions/mission4Quests';
import { mission5Quests } from './definitions/mission5Quests';

/** Internal mutable assembly bucket (never exported directly). */
const _QuestRegistry: Record<string, Quest> = {
  ...mission1Quests,
  ...mission2Quests,
  ...mission3Quests,
  ...mission4Quests,
  ...mission5Quests,
};

/** Immutable public surface – protects against runtime mutation. */
export const QuestRegistry: Readonly<Record<string, Quest>> =
  Object.freeze(_QuestRegistry);
