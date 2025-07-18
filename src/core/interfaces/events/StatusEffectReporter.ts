// src/core/interfaces/events/StatusEffectReporter.ts
import { GlobalEventBus } from '@/core/EventBus';
import type { Ship } from '@/game/ship/Ship';

export function reportDamageOverTime(
  target: Ship,
  source: Ship | null,
  amount: number,
  cause: 'dot'
): void {
  GlobalEventBus.emit('status:damageOverTime', { target, source, amount, cause });
}
