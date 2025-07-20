// src/systems/fx/ExplosionSystem.ts

import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';
import { SHIELD_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { ParticleManager } from '@/systems/fx/ParticleManager';

import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { ensureHexColor } from '@/shared/colorUtils';
import { randomFromArray } from '@/shared/arrayUtils';

import { BLOCK_SIZE } from '@/config/view';

import type { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import { emitBigExplosionFlames, emitDefaultFlames } from '@/core/interfaces/events/SpecialFxReporter';
import { serializeShip } from '../serialization/ShipSerializer';

interface LightExplosionOptions {
  lightColor?: string;
  lightRadiusScalar?: number;
  lightIntensity?: number;
  lightLifeScalar?: number;
}

export class ExplosionSystem {
  constructor(
    _canvasManager: CanvasManager, // unused, retained for signature compatibility
    private readonly camera: Camera,
    private readonly particleManager: ParticleManager,
    private readonly lightingOrchestrator?: LightingOrchestrator
  ) {}

  /** Emit a burst of particles and optional light flash at a world position */
  createExplosion(
    entityId: string,
    position: { x: number; y: number },
    size: number = 60,
    life: number = 0.6,
    color?: string,
    sparkPalette?: string[],
    lightOptions?: LightExplosionOptions,
    explosionType?: 'default' | 'lightless' | 'small' | 'none'
  ): void {
    this.particleManager.emitBurst(position, 10 + Math.floor(size / 10), {
      colors: sparkPalette,
      baseSpeed: 420,
      sizeRange: [1, 3],
      lifeRange: [0.4, 1],
      fadeOut: true
    });

    if (explosionType === 'lightless') {
      emitDefaultFlames(position.x, position.y, size, 0.8, false, 1);
    } else if (explosionType === 'small') {
      emitDefaultFlames(position.x, position.y, size * 0.5, 0.8, true, 1);
    } else if (explosionType === 'none') {
      // no-op
    } else {
      emitDefaultFlames(position.x, position.y, size, 0.8, true, 1);
    }

    if (lightOptions) {
      const hexColor = ensureHexColor(color);

      createLightFlash(
        position.x,
        position.y,
        size * (lightOptions.lightRadiusScalar ?? 5),
        lightOptions.lightIntensity ?? 0.3,
        life * (lightOptions.lightLifeScalar ?? 1.0),
        lightOptions.lightColor ?? hexColor,
        `explosion-${entityId}`
      );
    }
  }

  /** Emit a block-local explosion within a rotated ship */
  createBlockExplosion(
    entityId: string,
    shipPosition: { x: number; y: number },
    shipRotation: number,
    blockCoord: GridCoord,
    size: number = 70,
    life: number = 0.7,
    color?: string,
    sparkPalette?: string[],
    lightOptions?: LightExplosionOptions,
    explosionType?: 'default' | 'lightless' | 'small' | 'none'
  ): void {
    const localX = blockCoord.x * BLOCK_SIZE;
    const localY = blockCoord.y * BLOCK_SIZE;

    const cos = Math.cos(shipRotation);
    const sin = Math.sin(shipRotation);
    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;

    const worldX = shipPosition.x + rotatedX;
    const worldY = shipPosition.y + rotatedY;

    this.createExplosion(entityId, { x: worldX, y: worldY }, size, life, color, sparkPalette, lightOptions, explosionType);
  }

  /** Emit a spark burst and light flash at a deflecting shield impact site */
  createShieldDeflection(
    position: { x: number; y: number },
    sourceId: string,
    lightOptions?: LightExplosionOptions
  ): void {
    const palette = SHIELD_COLOR_PALETTES[sourceId];
    const explosionColor = palette?.[0] ?? 'rgba(100, 255, 255, 0.6)';
    const sparkPalette = palette ?? ['#ffff00', '#ff9900', '#ff6600'];

    const resolvedLightOptions: LightExplosionOptions | undefined = lightOptions
      ? {
          ...lightOptions,
          lightColor: lightOptions.lightColor ?? randomFromArray(palette ?? ['#00ffff']),
        }
      : undefined;

    this.createExplosion(sourceId, position, 34, 0.3, explosionColor, sparkPalette, resolvedLightOptions, 'none');
  }

  /** No-op retained for compatibility */
  update(_dt: number): void {
    // Legacy update logic removed
  }

  /** No-op retained for compatibility */
  render(): void {
    // Legacy render logic removed
  }

  /** Cleanup lights tagged as explosion-related */
  public destroy(): void {
    // if (this.lightingOrchestrator) {
    //   const activeLights = this.lightingOrchestrator.getActiveLightEntries();
    //   for (const [id, light] of activeLights) {
    //     if (light.expires) {
    //       this.lightingOrchestrator.removeLight(id);
    //     }
    //   }
    // }
  }
}
