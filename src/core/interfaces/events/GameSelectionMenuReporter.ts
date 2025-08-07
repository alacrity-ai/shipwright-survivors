// src/core/interfaces/events/GameSelectionMenuReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function launchGameFromSelectionMenu(): void {
  GlobalEventBus.emit('game:selection:menu:launchMission', undefined);
}

export function openCollectionFromSelectionMenu(): void {
  GlobalEventBus.emit('game:selection:menu:collection', undefined);
}

export function openPassiveSkillsFromSelectionMenu(): void {
  GlobalEventBus.emit('game:selection:menu:passiveSkills', undefined);
}

export function quitFromSelectionMenu(): void {
  GlobalEventBus.emit('game:selection:menu:quit', undefined);
}
