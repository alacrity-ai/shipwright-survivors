// src/core/interfaces/events/AbilityReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function updateBlockQueueAbilities(): void {
  GlobalEventBus.emit('abilities:update', undefined);
}

export function openAbilityAnnouncement(abilityKey: string): void {
  GlobalEventBus.emit('abilities:announcement:open', { abilityKey });
}
