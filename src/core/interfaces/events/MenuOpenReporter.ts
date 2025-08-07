// src/ui/menus/events/MenuOpenReporter.ts

import { GlobalEventBus } from '@/core/EventBus';
import { pauseRuntime, resumeRuntime } from '@/core/interfaces/events/RuntimeReporter';

import type { PowerupChannel } from '@/game/powerups/types/PowerupChannel';

export function menuOpened(id: string): void {
  GlobalEventBus.emit('menu:opened', { id });
}

export function menuClosed(id: string): void {
  GlobalEventBus.emit('menu:closed', { id });
}

export function openPowerupMenu(levelUps: number, channel: PowerupChannel): void {
  pauseRuntime();
  GlobalEventBus.emit('powerup:menu:open', { levelUps, channel });
}
