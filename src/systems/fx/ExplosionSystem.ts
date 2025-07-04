import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';
import { SHIELD_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { ParticleManager } from '@/systems/fx/ParticleManager';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { createPointLight } from '@/lighting/lights/createPointLight';
import { ensureHexColor } from '@/shared/colorUtils';
import { randomFromArray } from '@/shared/arrayUtils';

import { explosionSystemFrameBudgetMs } from '@/config/graphicsConfig';
import { BLOCK_SIZE } from '@/config/view';

import type { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';

interface Explosion {
  position: { x: number; y: number };
  size: number;
  maxSize: number;
  life: number;
  maxLife: number;
  color: string;
}

interface LightExplosionOptions {
  lightColor?: string;
  lightRadiusScalar?: number;
  lightIntensity?: number;
  lightLifeScalar?: number;
}

export class ExplosionSystem {
  private explosions: Explosion[] = [];
  private ctx: CanvasRenderingContext2D;

  private frameBudgetMs: number = explosionSystemFrameBudgetMs;
  private lastExplosionIndex: number = 0;

  constructor(
    canvasManager: CanvasManager,
    private readonly camera: Camera,
    private readonly particleManager: ParticleManager,
    private readonly lightingOrchestrator?: LightingOrchestrator
  ) {
    this.ctx = canvasManager.getContext('fx');
  }

  // Create an explosion at the given world position
  createExplosion(
    position: { x: number; y: number },
    size: number = 60,
    life: number = 0.6,
    color?: string,
    sparkPalette?: string[],
    lightOptions?: LightExplosionOptions
  ): void {
    this.particleManager.emitBurst(position, 10 + Math.floor(size / 10), {
      colors: sparkPalette,
      baseSpeed: 200,
      sizeRange: [1, 3],
      lifeRange: [0.4, 1],
      fadeOut: true
    });

    if (this.lightingOrchestrator && PlayerSettingsManager.getInstance().isLightingEnabled() && lightOptions) {
      const hexColor = ensureHexColor(color);
      const light = createPointLight({
        x: position.x,
        y: position.y,
        radius: size * (lightOptions.lightRadiusScalar ?? 5),
        color: lightOptions.lightColor ?? hexColor,
        intensity: lightOptions.lightIntensity ?? 0.3,
        life: life * (lightOptions.lightLifeScalar ?? 1.0),
        expires: true,
      });

      this.lightingOrchestrator.registerLight(light);
    }

    this.explosions.push({
      position: { ...position },
      size: 1, // Start small and grow
      maxSize: size,
      life,
      maxLife: life,
      color: color ?? this.getRandomExplosionColor(),
    });
  }

  // Create an explosion at a block's position within a ship
  createBlockExplosion(
    shipPosition: { x: number; y: number },
    shipRotation: number,
    blockCoord: GridCoord,
    size: number = 70, // Increased size
    life: number = 0.7,  // Increased life
    color?: string,
    sparkPalette?: string[],
    lightOptions?: LightExplosionOptions
  ): void {
    
    // Calculate block position in local ship space
    const localX = blockCoord.x * BLOCK_SIZE;
    const localY = blockCoord.y * BLOCK_SIZE;
    
    // Rotate to match ship orientation
    const cos = Math.cos(shipRotation);
    const sin = Math.sin(shipRotation);
    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;
    
    // Convert to world position
    const worldX = shipPosition.x + rotatedX;
    const worldY = shipPosition.y + rotatedY;
    
    // Create the explosion
    this.createExplosion({ x: worldX, y: worldY }, size, life, color, sparkPalette, lightOptions);
  }

  createShieldDeflection(
    position: { x: number; y: number },
    sourceId: string,
    lightOptions?: LightExplosionOptions
  ): void {
    const palette = SHIELD_COLOR_PALETTES[sourceId];
    const explosionColor = palette?.[0] ?? 'rgba(100, 255, 255, 0.6)';
    const sparkPalette = palette ?? ['#ffff00', '#ff9900', '#ff6600'];

    // Override lightColor based on palette if not explicitly set
    const resolvedLightOptions: LightExplosionOptions | undefined = lightOptions
      ? {
          ...lightOptions,
          lightColor: lightOptions.lightColor ?? randomFromArray(palette ?? ['#00ffff']),
        }
      : undefined;

    this.createExplosion(position, 34, 0.3, explosionColor, sparkPalette, resolvedLightOptions);
  }

  update(dt: number): void {
    const now = performance.now();
    const deadline = now + this.frameBudgetMs;

    const total = this.explosions.length;
    if (total === 0) return;

    let index = this.lastExplosionIndex % total;
    const updatedExplosions: Explosion[] = [];

    for (let processed = 0; processed < total; processed++) {
      const explosion = this.explosions[index];

      // === Update life ===
      explosion.life -= dt;

      const progress = 1 - (explosion.life / explosion.maxLife);
      if (progress < 0.5) {
        explosion.size = explosion.maxSize * (progress * 2);
      } else {
        explosion.size = explosion.maxSize * (1 - (progress - 0.5) * 2);
      }

      if (explosion.life > 0) {
        updatedExplosions.push(explosion);
      }

      if (performance.now() > deadline) {
        this.lastExplosionIndex = (index + 1) % total;
        this.explosions = updatedExplosions.concat(
          this.explosions.slice((index + 1) % total)
        );
        return;
      }

      index = (index + 1) % total;
    }

    // Completed all updates; reset state
    this.lastExplosionIndex = 0;
    this.explosions = updatedExplosions;
  }

  render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.camera.getZoom(), this.camera.getZoom());
    
    for (const explosion of this.explosions) {
      const screen = this.camera.worldToScreen(explosion.position.x, explosion.position.y);
      const x = screen.x / this.camera.getZoom();
      const y = screen.y / this.camera.getZoom();
      
      // Create a radial gradient for the explosion
      const gradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, explosion.size
      );
      
      // Calculate alpha based on remaining life
      const alpha = explosion.life / explosion.maxLife;
      
      gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
      gradient.addColorStop(0.2, `${explosion.color}`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, explosion.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  private getRandomExplosionColor(): string {
    const colors = [
      'rgba(255, 100, 0, 0.8)',  // Orange
      'rgba(255, 50, 0, 0.8)',   // Red-orange
      'rgba(255, 200, 0, 0.8)',  // Yellow-orange
      'rgba(200, 0, 0, 0.8)'     // Deep red
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }

  public destroy(): void {
    // Clear internal explosion state
    this.explosions.length = 0;
    this.lastExplosionIndex = 0;

    // Clear emitted lights from lingering explosions
    if (this.lightingOrchestrator) {
      const activeLights = this.lightingOrchestrator.getActiveLightEntries();
      for (const [id, light] of activeLights) {
        // Optional: only remove if this system tagged them (e.g., with prefix 'explosion_')
        if (light.expires) {
          this.lightingOrchestrator.removeLight(id);
        }
      }
    }
  }
}
