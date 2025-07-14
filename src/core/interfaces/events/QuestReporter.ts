// src/core/interfaces/events/QuestReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function openQuestAnnouncement(questId: string): void {
  GlobalEventBus.emit('quests:announcement:open', { questId });
}

export function reportQuestCompleted(questId: string): void {
  GlobalEventBus.emit('quests:complete', { questId });
}

export function openShipAnnouncement(shipId: string): void {
  GlobalEventBus.emit('quests:announcement:ship', { shipId });
}

export function openCoreRewardAnnouncement(amount: number): void {
  GlobalEventBus.emit('quests:announcement:cores', { amount });
}

export function openAbilityAnnouncement(abilityKey: string): void {
  GlobalEventBus.emit('abilities:announcement:open', { abilityKey });
}
