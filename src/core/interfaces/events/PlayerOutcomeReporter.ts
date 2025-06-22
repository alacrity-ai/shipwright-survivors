// src/core/interfaces/events/PlayerOutcomeReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function emitPlayerVictory(): void {
  GlobalEventBus.emit('player:victory', undefined);
}

export function emitPlayerDefeat(): void {
  GlobalEventBus.emit('player:defeat', undefined);
}
