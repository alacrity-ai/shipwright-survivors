// src/core/interfaces/events/AbilityReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function updateBlockQueueAbilities(): void {
  GlobalEventBus.emit('abilities:update', undefined);
}

export function unlockAllAbilities(): void {
  GlobalEventBus.emit('abilities:unlock-all', undefined);
}
