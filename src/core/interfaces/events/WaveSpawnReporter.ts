// src/core/interfaces/events/WaveSpawnReporter.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import { GlobalEventBus } from '@/core/EventBus';

export function spawnWave(tag: string, wave: WaveDefinition, auraLightProps?: { color?: string; radius?: number; intensity?: number }): void {
  GlobalEventBus.emit('wave:spawn', { tag, wave, auraLightProps });
}

export function clearWave(tag: string): void {
  GlobalEventBus.emit('wave:clear', { tag });
}

export function completeWave(tag: string): void {
  GlobalEventBus.emit('wave:completed', { tag });
}
