// src/systems/fx/ShipBuilderEffectsSystem.ts

import type { IUpdatable, IRenderable } from '@/core/interfaces/types';
import type { ParticleManager } from '@/systems/fx/ParticleManager';

type EffectKind = 'repair' | 'sell';

interface BuilderEffect {
  kind: EffectKind;
  position: { x: number; y: number };
  size: number;
  maxSize: number;
  life: number;
  maxLife: number;
  color: string;
}

export class ShipBuilderEffectsSystem implements IUpdatable {
  runWhilePaused = true;

  private effects: BuilderEffect[] = [];

  constructor(
    private readonly particleManager: ParticleManager
  ) {}

  createRepairEffect(
    position: { x: number; y: number },
    size: number = 48,
    life: number = 0.5,
    colorPalette?: string[]
  ): void {
    this.effects.push(this.createEffect(position, size, life, 'repair', colorPalette));
    this.emitParticles(position, 'repair', colorPalette);
  }

  createSellEffect(
    position: { x: number; y: number },
    size: number = 48,
    life: number = 0.5
  ): void {
    this.effects.push(this.createEffect(position, size, life, 'sell'));
    this.emitParticles(position, 'sell');
  }

  private createEffect(
    position: { x: number; y: number },
    size: number,
    life: number,
    kind: EffectKind,
    overridePalette?: string[]
  ): BuilderEffect {
    const palette = overridePalette ?? this.getDefaultPalette(kind);
    return {
      kind,
      position: { ...position },
      size: 0,
      maxSize: size,
      life,
      maxLife: life,
      color: palette[Math.floor(Math.random() * palette.length)],
    };
  }

  private emitParticles(
    position: { x: number; y: number },
    kind: EffectKind,
    overridePalette?: string[]
  ): void {
    const colors = overridePalette ?? this.getDefaultPalette(kind);

    this.particleManager.emitBurst(position, 24, {
      colors,
      randomDirection: true,
      speedRange: [160, 300],
      sizeRange: [0.8, 1.8],
      lifeRange: [0.2, 0.7],
      fadeOut: true,
      light: true,
      lightRadiusScalar: 32,
      lightIntensity: 0.2,
    });
  }

  update(dt: number): void {
    for (const effect of this.effects) {
      effect.life -= dt;
      const progress = 1 - effect.life / effect.maxLife;
      effect.size =
        progress < 0.5
          ? effect.maxSize * (progress * 2)
          : effect.maxSize * (1 - (progress - 0.5) * 2);
    }

    this.effects = this.effects.filter(e => e.life > 0);
  }

  render(): void {
    // NOOP
  }

  private getDefaultPalette(kind: EffectKind): string[] {
    const palettes = {
      repair: ['#00ffff', '#66ffcc', '#66ccff', '#33ffee', '#ccffff'],
      sell: ['#ff6666', '#ff3333', '#ff9999', '#ff4444', '#ff2200'],
    };
    return palettes[kind];
  }
}
