// src/core/interfaces/events/EntityReporter.ts

import { GlobalEventBus } from '@/core/EventBus';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { DestructionCause } from '@/game/ship/CompositeBlockDestructionService';

/**
 * Emits a global destruction event for a CompositeBlockObject.
 * This allows systems like CompositeBlockDestructionService to handle the destruction logic.
 */
export function destroyEntityExternally(
  entity: CompositeBlockObject,
  cause: DestructionCause = 'scripted'
): void {
  GlobalEventBus.emit('entity:destroy', { entity, cause });
}
