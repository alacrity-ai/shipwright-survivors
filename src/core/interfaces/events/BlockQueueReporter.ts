// src/core/interfaces/events/BlockQueueReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

/**
 * Emits an intent to place a block from the player's block queue.
 * This does not guarantee placement — the receiving system must validate it.
 */
export function requestPlaceBlockFromQueue(index: number, blockTypeId: string): void {
  GlobalEventBus.emit('blockqueue:request-place', { index, blockTypeId });
}

export function requestRefineBlockFromQueue(index: number, blockTypeId: string): void {
  GlobalEventBus.emit('blockqueue:request-refine', { index, blockTypeId });
}
