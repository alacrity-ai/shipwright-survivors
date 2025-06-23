// src/systems/pickups/helpers/spawnRepairExplosion.ts

import { spawnRepairPickup } from '@/core/interfaces/events/PickupSpawnReporter';

interface RepairExplosionOptions {
  x: number;
  y: number;
  totalAmount: number;
  pickupCount: number;
  spreadRadius: number;
  randomizeAmount?: boolean;
}

/**
 * Spawns a radial explosion of repair pickups scattered around a point.
 */
export function spawnRepairExplosion({
  x,
  y,
  totalAmount,
  pickupCount,
  spreadRadius,
  randomizeAmount = true,
}: RepairExplosionOptions): void {
  if (pickupCount <= 0 || totalAmount <= 0) return;

  const amounts: number[] = [];

  if (randomizeAmount) {
    let remaining = totalAmount;
    for (let i = 0; i < pickupCount - 1; i++) {
      const max = Math.max(1, Math.floor(remaining / (pickupCount - i) * 2));
      const value = Math.max(1, Math.floor(Math.random() * max));
      amounts.push(value);
      remaining -= value;
    }
    amounts.push(Math.max(1, remaining));
  } else {
    const base = Math.floor(totalAmount / pickupCount);
    const extra = totalAmount % pickupCount;
    for (let i = 0; i < pickupCount; i++) {
      amounts.push(base + (i < extra ? 1 : 0));
    }
  }

  for (let i = 0; i < pickupCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * spreadRadius;

    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;

    spawnRepairPickup(x + dx, y + dy, amounts[i]);
  }
}

/* Usage:
import { spawnRepairExplosion } from '@/systems/pickups/helpers/spawnRepairExplosion';

spawnRepairExplosion({
  x: 2500,
  y: 1300,
  totalAmount: 300,
  pickupCount: 15,
  spreadRadius: 1000,
  randomizeAmount: true,
});
*/