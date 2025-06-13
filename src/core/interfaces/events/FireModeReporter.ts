// src/core/interfaces/events/FireModeReporter.ts

import { GlobalEventBus } from '@/core/EventBus';
import type { FiringMode } from '@/systems/combat/types/WeaponTypes';

export function fireModeChanged(mode: FiringMode): void {
  GlobalEventBus.emit('player:firemode:changed', { mode });
}
