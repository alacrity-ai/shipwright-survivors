// src/core/interfaces/events/PickupSpawnReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function spawnBlockPickup(
  x: number,
  y: number,
  blockTypeId: string
): void {
  GlobalEventBus.emit('pickup:spawn:block', { x, y, blockTypeId });
}

export function spawnCurrencyPickup(
  x: number,
  y: number,
  currencyType: string,
  amount: number
): void {
  GlobalEventBus.emit('pickup:spawn:currency', { x, y, currencyType, amount });
}

export function spawnRepairPickup(
  x: number,
  y: number,
  amount: number
): void {
  GlobalEventBus.emit('pickup:spawn:repair', { x, y, amount });
}
