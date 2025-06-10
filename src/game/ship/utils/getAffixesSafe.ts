// src/game/ship/utils/getAffixesSafe.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { ShipAffixes } from '@/game/interfaces/types/ShipAffixes';
import type { Ship } from '@/game/ship/Ship';

export function getAffixesSafe(obj: CompositeBlockObject): ShipAffixes {
  return (typeof (obj as any).getAffixes === 'function') ? (obj as Ship).getAffixes() ?? {} : {};
}
