// src/game/powerups/runtime/ActivePowerupEffectResolver.ts
//
// Aggregates the cumulative effect of all acquired power-ups.  Numeric values
// are additive, booleans overwrite, and complex structures (e.g. resupply
// bundles) are concatenated in acquisition order for deterministic playback.
//

import { PlayerPowerupManager } from '@/game/player/PlayerPowerupManager';
import { PowerupRegistry }     from '@/game/powerups/registry/PowerupRegistry';

import type { PowerupNodeDefinition }  from '@/game/powerups/registry/PowerupNodeDefinition';
import type {
  PowerupEffectMetadata,
  GrantRandomBlocksEffect,
} from '@/game/powerups/types/PowerupMetadataTypes';

export function getAggregatedPowerupEffects(): PowerupEffectMetadata {
  const acquiredIds = PlayerPowerupManager.getInstance().getAll();
  const total: PowerupEffectMetadata = {};

  /* ──────────────────────────────────────────────────────────────── */
  /* 1.  Walk every acquired node and merge its authored metadata.   */
  /* ──────────────────────────────────────────────────────────────── */
  for (const id of acquiredIds) {
    const node = PowerupRegistry.get(id);
    if (!node?.metadata) continue;

    for (const [key, value] of Object.entries(node.metadata)) {
      /* ---------- Numbers: additive ---------- */
      if (typeof value === 'number') {
        const cur = total[key as keyof PowerupEffectMetadata] as number | undefined;
        total[key as keyof PowerupEffectMetadata] = ((cur ?? 0) + value) as any;
        continue;
      }

      /* ---------- Booleans: last-write-wins ---------- */
      if (typeof value === 'boolean') {
        total[key as keyof PowerupEffectMetadata] = value;
        continue;
      }

      /* ---------- Complex: grantRandomBlocks ---------- */
      if (key === 'grantRandomBlocks') {
        const cur = total.grantRandomBlocks;
        if (!cur) {
          // first entry
          total.grantRandomBlocks = value as GrantRandomBlocksEffect;
        } else {
          // promote to array and preserve order
          total.grantRandomBlocks = Array.isArray(cur)
            ? [...cur, value as GrantRandomBlocksEffect]
            : [cur, value as GrantRandomBlocksEffect];
        }
        continue;
      }

      /* ---------- Fallback: opaque overwrite ---------- */
      total[key as keyof PowerupEffectMetadata] = value as any;
    }

    /* ────────────────────────────────────────────────────────────── */
    /* 2.  Climb any procedural ancestry chain and apply scaling.    */
    /* ────────────────────────────────────────────────────────────── */
    let current: PowerupNodeDefinition | undefined = node;
    while (current?.isProcedural && current.scaling) {
      for (const [key, delta] of Object.entries(current.scaling)) {
        if (typeof delta !== 'number') continue; // only numerical scaling supported

        const cur = total[key as keyof PowerupEffectMetadata];
        if (typeof cur === 'number' || cur === undefined) {
          total[key as keyof PowerupEffectMetadata] = ((cur ?? 0) + delta) as any;
        } else {
          console.warn(
            `[PowerupEffectResolver] Cannot apply numeric scaling to non-number key: ${key}`,
          );
        }
      }
      current = PowerupRegistry.get(current.parentId ?? '');
    }
  }

  return total;
}

/* Example aggregated payload:
{
  baseDamageMultiplier:        1.1,
  cockpitInvulnChance:         0.55,
  critChance:                  0.49,
  critMultiplier:              5.55,
  fireRateMultiplier:          3.6,
  flatDamageReductionPercent:  0.36,
  grantRandomBlocks: [
    { tier: 4, count: 3 },
    { tier: 5, count: 1 },
    { tier: 5, count: 2 }
  ]
}
*/
