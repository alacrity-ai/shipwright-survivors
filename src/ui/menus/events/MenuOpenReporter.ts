// src/ui/menus/events/MenuOpenReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function menuOpened(id: string): void {
  GlobalEventBus.emit('menu:opened', { id });
}

export function menuClosed(id: string): void {
  GlobalEventBus.emit('menu:closed', { id });
}
