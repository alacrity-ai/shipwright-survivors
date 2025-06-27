// src/game/powerups/runtime/ActivePowerupEffectResolver.ts

import { PlayerPowerupManager } from './PlayerPowerupManager';
import { PowerupRegistry } from '../registry/PowerupRegistry';
import type { PowerupNodeDefinition } from '../registry/PowerupNodeDefinition';
import type { PowerupEffectMetadata } from '../types/PowerupMetadataTypes';

export function getAggregatedPowerupEffects(): PowerupEffectMetadata {
  const acquiredIds = PlayerPowerupManager.getInstance().getAll();
  const total: PowerupEffectMetadata = {};

  for (const id of acquiredIds) {
    const node = PowerupRegistry.get(id);
    if (!node) continue;

    // === 1. Apply base metadata (authored or capstone)
    if (node.metadata) {
      for (const [key, value] of Object.entries(node.metadata)) {
        const currentVal = total[key as keyof PowerupEffectMetadata];
        if (typeof value === 'number') {
          total[key as keyof PowerupEffectMetadata] =
            ((typeof currentVal === 'number' ? currentVal : 0) + value) as any;
        } else {
          total[key as keyof PowerupEffectMetadata] = value;
        }
      }
    }

    // === 2. Climb procedural ancestry and apply scaling
    let current: PowerupNodeDefinition | undefined = node;

    while (current && current.isProcedural && current.scaling) {
      for (const [key, delta] of Object.entries(current.scaling)) {
        const currentVal = total[key as keyof PowerupEffectMetadata];
        if (typeof delta === 'number') {
          if (typeof currentVal === 'number' || currentVal === undefined) {
            total[key as keyof PowerupEffectMetadata] =
              ((currentVal ?? 0) + delta) as any;
          } else {
            console.warn(`[PowerupEffectResolver] Cannot apply numeric scaling to non-number key: ${key}`);
          }
        }
      }
      current = PowerupRegistry.get(current.parentId ?? '');
    }
  }

  return total;
}
