// src/game/waves/executor/SpawnCoordinateResolver.ts

import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import { getWorldHeight, getWorldWidth } from '@/config/world';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

// === Configuration Constants ===

// Central "forbidden zone" (used in 'outer' and 'inner' spawn modes)
const FORBIDDEN_ZONE = {
  xMin: -1000,
  xMax: 1000,
  yMin: -1000,
  yMax: 1000,
};

// Player-centered ring (used in 'aroundPlayer' mode)
const PLAYER_SPAWN_RADIUS_MIN = 2600;
const PLAYER_SPAWN_RADIUS_VARIANCE = 1200;

// Fallback spawn padding for failed attempts to find a legal 'outer' spawn
const OUTER_SPAWN_PADDING = 200;

export class SpawnCoordinateResolver {
  public getCoords(
    spawnDistribution: WaveDefinition['spawnDistribution'] = 'random'
  ): { x: number; y: number } {
    switch (spawnDistribution) {
      case 'random':
        return this.randomAnywhere();

      case 'outer':
        return this.randomOutsideForbidden();

      case 'inner':
        return this.randomInsideForbidden();

      case 'aroundPlayer':
        return this.spawnAroundPlayer();

      case 'center':
        return { x: 0, y: 0 };

      default:
        console.warn(`[SpawnCoordinateResolver] Unknown spawnDistribution '${spawnDistribution}', falling back to 'random'.`);
        return this.randomAnywhere();
    }
  }

  private randomAnywhere(): { x: number; y: number } {
    const x = Math.random() * getWorldWidth() - getWorldWidth() / 2;
    const y = Math.random() * getWorldHeight() - getWorldHeight() / 2;
    return { x, y };
  }

  private randomOutsideForbidden(): { x: number; y: number } {
    const maxAttempts = 10;

    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.random() * getWorldWidth() - getWorldWidth() / 2;
      const y = Math.random() * getWorldHeight() - getWorldHeight() / 2;

      if (this.isOutsideForbidden(x, y)) {
        return { x, y };
      }
    }

    return this.fallbackOutsideForbidden();
  }

  private randomInsideForbidden(): { x: number; y: number } {
    const x = (Math.random() - 0.5) * (FORBIDDEN_ZONE.xMax - FORBIDDEN_ZONE.xMin);
    const y = (Math.random() - 0.5) * (FORBIDDEN_ZONE.yMax - FORBIDDEN_ZONE.yMin);
    return { x, y };
  }

  private spawnAroundPlayer(): { x: number; y: number } {
    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    if (!playerShip) return { x: 0, y: 0 };

    const playerPos = playerShip.getTransform().position;
    const angle = Math.random() * Math.PI * 2;
    const radius = PLAYER_SPAWN_RADIUS_MIN + Math.random() * PLAYER_SPAWN_RADIUS_VARIANCE;

    const x = playerPos.x + Math.cos(angle) * radius;
    const y = playerPos.y + Math.sin(angle) * radius;

    return { x, y };
  }

  private fallbackOutsideForbidden(): { x: number; y: number } {
    const x = Math.random() < 0.5
      ? FORBIDDEN_ZONE.xMin - OUTER_SPAWN_PADDING - Math.random() * OUTER_SPAWN_PADDING
      : FORBIDDEN_ZONE.xMax + OUTER_SPAWN_PADDING + Math.random() * OUTER_SPAWN_PADDING;

    const y = Math.random() < 0.5
      ? FORBIDDEN_ZONE.yMin - OUTER_SPAWN_PADDING - Math.random() * OUTER_SPAWN_PADDING
      : FORBIDDEN_ZONE.yMax + OUTER_SPAWN_PADDING + Math.random() * OUTER_SPAWN_PADDING;

    return { x, y };
  }

  private isOutsideForbidden(x: number, y: number): boolean {
    return (
      x < FORBIDDEN_ZONE.xMin || x > FORBIDDEN_ZONE.xMax ||
      y < FORBIDDEN_ZONE.yMin || y > FORBIDDEN_ZONE.yMax
    );
  }
}
