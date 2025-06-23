// src/systems/pickups/helpers/spawnCurrencyExplosion.ts

import { spawnCurrencyPickup } from '@/core/interfaces/events/PickupSpawnReporter';

interface CurrencyExplosionOptions {
  x: number;
  y: number;
  currencyType: string;
  totalAmount: number;
  pickupCount: number;
  spreadRadius: number;
  randomizeAmount?: boolean; // If true, split value with randomness
}

/**
 * Spawns a burst of currency pickups in a circular spread around (x, y).
 */
export function spawnCurrencyExplosion({
  x,
  y,
  currencyType,
  totalAmount,
  pickupCount,
  spreadRadius,
  randomizeAmount = true,
}: CurrencyExplosionOptions): void {
  if (pickupCount <= 0 || totalAmount <= 0) return;

  const amounts: number[] = [];

  if (randomizeAmount) {
    // === Split totalAmount into N random-positive integers summing to totalAmount ===
    let remaining = totalAmount;
    for (let i = 0; i < pickupCount - 1; i++) {
      const maxForThis = Math.max(1, Math.floor(remaining / (pickupCount - i) * 2));
      const value = Math.max(1, Math.floor(Math.random() * maxForThis));
      amounts.push(value);
      remaining -= value;
    }
    amounts.push(Math.max(1, remaining)); // Ensure total sum matches
  } else {
    const base = Math.floor(totalAmount / pickupCount);
    const extra = totalAmount % pickupCount;
    for (let i = 0; i < pickupCount; i++) {
      amounts.push(base + (i < extra ? 1 : 0));
    }
  }

  // === Spawn each pickup with radial jitter ===
  for (let i = 0; i < pickupCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * spreadRadius;

    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;

    spawnCurrencyPickup(x + dx, y + dy, currencyType, amounts[i]);
  }
}

/* Example Usage:
import { spawnCurrencyExplosion } from '@/systems/pickups/helpers/spawnCurrencyExplosion';

spawnCurrencyExplosion({
  x: 5000,
  y: -3200,
  currencyType: 'scrap',        // Your game's currency type
  totalAmount: 450,             // Total currency to distribute
  pickupCount: 30,              // Number of pickup entities
  spreadRadius: 1400,           // Circular explosion radius
  randomizeAmount: true,        // Use varying amounts per pickup
});
*/