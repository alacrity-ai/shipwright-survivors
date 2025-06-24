import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import { getWorldHeight, getWorldWidth } from '@/config/world';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

// === Configuration Constants ===

const FORBIDDEN_ZONE = {
  xMin: -1000,
  xMax: 1000,
  yMin: -1000,
  yMax: 1000,
};

const PLAYER_SPAWN_RADIUS_FAR_MIN = 2600;
const PLAYER_SPAWN_RADIUS_FAR_MAX = PLAYER_SPAWN_RADIUS_FAR_MIN + 1200;

const PLAYER_SPAWN_RADIUS_NEAR_MIN = 500;
const PLAYER_SPAWN_RADIUS_NEAR_MAX = 800;

const OUTER_SPAWN_PADDING = 200;

export class SpawnCoordinateResolver {
  public getCoords(wave: WaveDefinition): { x: number; y: number } {
    const distribution = wave.spawnDistribution ?? 'random';

    switch (distribution) {
      case 'random':
        return this.randomAnywhere();

      case 'outer':
        return this.randomOutsideForbidden();

      case 'inner':
        return this.randomInsideForbidden();

      case 'aroundPlayer':
        return this.spawnAroundPlayer(PLAYER_SPAWN_RADIUS_FAR_MIN, PLAYER_SPAWN_RADIUS_FAR_MAX);

      case 'aroundPlayerNear':
        return this.spawnAroundPlayer(PLAYER_SPAWN_RADIUS_NEAR_MIN, PLAYER_SPAWN_RADIUS_NEAR_MAX);

      case 'center':
        return { x: 0, y: 0 };

      case 'at': {
        const { atCoords } = wave;
        if (!atCoords) return { x: 0, y: 0 };

        const spread = atCoords.spreadRadius ?? 0;
        return spread > 0
          ? this.spawnAroundPoint(atCoords, spread)
          : { x: atCoords.x, y: atCoords.y };
      }

      default:
        console.warn(`[SpawnCoordinateResolver] Unknown spawnDistribution '${distribution}', falling back to 'random'.`);
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
      if (this.isOutsideForbidden(x, y)) return { x, y };
    }
    return this.fallbackOutsideForbidden();
  }

  private randomInsideForbidden(): { x: number; y: number } {
    const x = (Math.random() - 0.5) * (FORBIDDEN_ZONE.xMax - FORBIDDEN_ZONE.xMin);
    const y = (Math.random() - 0.5) * (FORBIDDEN_ZONE.yMax - FORBIDDEN_ZONE.yMin);
    return { x, y };
  }

  private spawnAroundPlayer(minRadius: number, maxRadius: number): { x: number; y: number } {
    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    if (!playerShip) return { x: 0, y: 0 };

    const playerPos = playerShip.getTransform().position;
    const angle = Math.random() * Math.PI * 2;
    const radius = minRadius + Math.random() * (maxRadius - minRadius);

    return {
      x: playerPos.x + Math.cos(angle) * radius,
      y: playerPos.y + Math.sin(angle) * radius,
    };
  }

  private spawnAroundPoint(center: { x: number; y: number }, radius: number): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius; // uniform area sampling
    return {
      x: center.x + Math.cos(angle) * r,
      y: center.y + Math.sin(angle) * r,
    };
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
