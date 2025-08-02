// src/game/boss/ai/mechanics/helpers/spawnMineHelper.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import { spawnWave, clearWave } from '@/core/interfaces/events/WaveSpawnReporter';

const SCRATCH_AURALIGHT_PROPS = { color: '#ff0000', radius: 400, intensity: 1.6 };

/**
 * Spawns a single invulnerable mine at the given world position.
 * Returns the generated wave tag (e.g. 'mine_07') for later use in `clearWave(tag)`.
 */
export function spawnMineWave(
  index: number,
  position: { x: number; y: number },
  shipId: string = 'mines/mine_00'
): string {
  const tag = `mine_${index}`;

  const wave: WaveDefinition = {
    spawnDistribution: 'at',
    atCoords: {
      x: position.x,
      y: position.y,
    },
    duration: Infinity, // mines never auto-expire until cleared explicitly
    ships: [
      {
        shipId,
        count: 1,
        affixes: { invulnerable: true },
        noClip: true,
      },
    ],
    mods: [],
    formations: [],
  };

  if (shipId === 'mines/mine_00') {
    SCRATCH_AURALIGHT_PROPS.radius = 400;
  } else {
    SCRATCH_AURALIGHT_PROPS.radius = 2048;
  }
  spawnWave(tag, wave, SCRATCH_AURALIGHT_PROPS);
  return tag;
}

/**
 * Clears a previously spawned mine by tag.
 */
export function clearMineWave(tag: string): void {
  clearWave(tag);
}
