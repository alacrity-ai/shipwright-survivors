// src/core/interfaces/events/WaveSpawnReporter.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import { GlobalEventBus } from '@/core/EventBus';

export function spawnWave(tag: string, wave: WaveDefinition): void {
  GlobalEventBus.emit('wave:spawn', { tag, wave });
}

export function clearWave(tag: string): void {
  GlobalEventBus.emit('wave:clear', { tag });
}

// ADDED
export function completeWave(tag: string): void {
  GlobalEventBus.emit('wave:completed', { tag });
}
