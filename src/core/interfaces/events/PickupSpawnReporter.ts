// src/core/interfaces/events/PickupSpawnReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function disablePickupDrops(): void {
  GlobalEventBus.emit('pickup:disableDrops', undefined);
}

export function enablePickupDrops(): void {
  GlobalEventBus.emit('pickup:enableDrops', undefined);
}

export function reportPickupCollected(typeId: string): void {
  GlobalEventBus.emit('pickup:collected', { typeId });
}

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

export function spawnQuantumAttractor(
  x: number,
  y: number
): void {
  GlobalEventBus.emit('pickup:spawn:quantumAttractor', { x, y });
}

export function spawnShipBlueprint(
  x: number,
  y: number,
  shipId: string
): void {
  GlobalEventBus.emit('pickup:spawn:shipBlueprint', { x, y, shipId });
}
