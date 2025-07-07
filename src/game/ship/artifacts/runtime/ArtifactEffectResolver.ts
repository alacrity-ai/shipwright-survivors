// src/game/ship/artifacts/runtime/ArtifactEffectResolver.ts

import type { ArtifactEffectMetadata } from '@/game/ship/artifacts/interfaces/ArtifactEffectMetadata';
import { PlayerArtifactsManager } from '@/game/player/PlayerArtifactsManager';
import { getArtifactById } from '@/game/ship/artifacts/registry/ArtifactRegistry';

/**
 * Aggregates the metadata from both equipped artifacts for a given ship.
 */
export function getAggregatedArtifactEffects(shipName: string): ArtifactEffectMetadata {
  const manager = PlayerArtifactsManager.getInstance();
  const equipped = manager.getEquippedArtifacts(shipName);

  const total: ArtifactEffectMetadata = {};

  for (const artifactId of equipped) {
    if (!artifactId) continue;

    const def = getArtifactById(artifactId);
    if (!def) {
      console.warn(`[ArtifactEffectResolver] Missing artifact definition: ${artifactId}`);
      continue;
    }

    const metadata = def.metadata;

    for (const [key, value] of Object.entries(metadata) as [keyof ArtifactEffectMetadata, any][]) {
      const current = total[key];

      if (typeof value === 'number') {
        total[key] = ((typeof current === 'number' ? current : 0) + value) as any;
      }

      else if (typeof value === 'boolean') {
        total[key] = value as any;
      }

      else if (Array.isArray(value)) {
        if (Array.isArray(current)) {
          total[key] = Array.from(new Set([...current, ...value])) as any;
        } else {
          total[key] = [...value] as any;
        }
      }

      else {
        console.warn(`[ArtifactEffectResolver] Unhandled metadata type for key: ${key}`, value);
      }
    }
  }

  return total;
}

/* Usage:
getAggregatedArtifactEffects('vanguard');
/*
{
  maxHealthBonus: 150,
  energyRegenRate: 0.25,
  reviveOnDeath: true,
  startingBlocks: ['turret1']
}
*/
