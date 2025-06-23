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

  createRepairEffect(position: { x: number; y: number }, size: number = 48, life: number = 0.5): void {
    this.effects.push(this.createEffect(position, size, life, 'repair'));
    this.emitParticles(position, 'repair');
  }

  createSellEffect(position: { x: number; y: number }, size: number = 48, life: number = 0.5): void {
    this.effects.push(this.createEffect(position, size, life, 'sell'));
    this.emitParticles(position, 'sell');
  }

  private createEffect(
    position: { x: number; y: number },
    size: number,
    life: number,
    kind: EffectKind
  ): BuilderEffect {
    return {
      kind,
      position: { ...position },
      size: 0,
      maxSize: size,
      life,
      maxLife: life,
      color: this.getRandomColor(kind)
    };
  }

  private emitParticles(position: { x: number; y: number }, kind: EffectKind): void {
    const colorPalettes = {
      repair: ['#00ffff', '#66ffcc', '#66ccff', '#33ffee', '#ccffff'],
      sell: ['#ff6666', '#ff3333', '#ff9999', '#ff4444', '#ff2200'],
    };

    const colors = colorPalettes[kind];

    this.particleManager.emitBurst(position, 24, {
      colors,
      randomDirection: true,
      speedRange: [220, 340],
      sizeRange: [0.5, 1.2],
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

  private getRandomColor(kind: EffectKind): string {
    const palettes = {
      repair: ['#00ffff', '#66ffcc', '#66ccff', '#33ffee', '#ccffff'],
      sell: ['#ff6666', '#ff3333', '#ff9999', '#ff4444', '#ff2200'],
    };
    const palette = palettes[kind];
    return palette[Math.floor(Math.random() * palette.length)];
  }
}
