// src/core/interfaces/events/PopupWindowReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function displayPopupWindowMessage(title: string, content: string, timerSeconds?: number): void {
  GlobalEventBus.emit('popup:window:show', { title, content, timerSeconds });
}

export function closePopupWindow(): void {
  GlobalEventBus.emit('popup:window:hide', undefined);
}
