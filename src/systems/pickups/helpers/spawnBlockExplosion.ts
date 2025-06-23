// src/systems/pickups/helpers/spawnBlockExplosion.ts

import { spawnBlockPickup } from '@/core/interfaces/events/PickupSpawnReporter';
import { getAllBlocksInTier } from '@/game/blocks/BlockRegistry';
import type { BlockType } from '@/game/interfaces/types/BlockType';

interface BlockExplosionOptions {
  x: number;
  y: number;
  tier: number;
  blockCount: number;
  spreadRadius: number;
}

/**
 * Spawns a radial explosion of randomized block pickups of the specified tier.
 */
export function spawnBlockExplosion({
  x,
  y,
  tier,
  blockCount,
  spreadRadius,
}: BlockExplosionOptions): void {
  if (blockCount <= 0) return;

  const candidates: BlockType[] = getAllBlocksInTier(tier);
  if (candidates.length === 0) {
    console.warn(`[spawnBlockExplosion] No block types found for tier ${tier}`);
    return;
  }

  for (let i = 0; i < blockCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * spreadRadius;

    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;

    const block = candidates[Math.floor(Math.random() * candidates.length)];
    spawnBlockPickup(x + dx, y + dy, block.id);
  }
}

/* Usage:
import { spawnBlockExplosion } from '@/systems/pickups/helpers/spawnBlockExplosion';

spawnBlockExplosion({
  x: 1000,
  y: -800,
  tier: 3,
  blockCount: 20,
  spreadRadius: 1200,
});
*/