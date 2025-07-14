// src/core/interfaces/events/QuestReporter.ts

import { GlobalEventBus } from '@/core/EventBus';
import type { QuestStepId } from '@/game/quests/interfaces/QuestStep';

export function openQuestsMenu(planetName: string): void {
  GlobalEventBus.emit('quests:menu:open', { planetName });
}

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

export function openArtifactAnnouncement(artifactId: string): void {
  GlobalEventBus.emit('quests:announcement:artifact', { artifactId });
}

export function reportQuestStepUpdated(stepId: QuestStepId, value: number | boolean | string): void {
  GlobalEventBus.emit('quests:step:update', { stepId, value }); // stepId mirros the 'kind' field in QuestStep
}
