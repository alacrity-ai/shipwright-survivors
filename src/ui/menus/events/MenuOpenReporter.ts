// src/ui/menus/events/MenuOpenReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export interface IncidentMenuOpenEvent {
  id: string; // Name or unique identifier of the menu
}

export function menuOpened(event: IncidentMenuOpenEvent): void {
  GlobalEventBus.emit('menu:opened', event);
}

export function menuClosed(event: IncidentMenuOpenEvent): void {
  GlobalEventBus.emit('menu:closed', event);
}

