// src/systems/fx/ShipBuilderEffectsSystem.ts

import type { IUpdatable, IRenderable } from '@/core/interfaces/types';
import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
}

type EffectKind = 'repair' | 'sell';

interface BuilderEffect {
  kind: EffectKind;
  position: { x: number; y: number };
  size: number;
  maxSize: number;
  life: number;
  maxLife: number;
  color: string;
  sparkles: Sparkle[];
}

export class ShipBuilderEffectsSystem implements IUpdatable, IRenderable {
  runWhilePaused = true;

  private effects: BuilderEffect[] = [];
  private ctx: CanvasRenderingContext2D;

  constructor(
    canvasManager: CanvasManager,
    private readonly camera: Camera
  ) {
    this.ctx = canvasManager.getContext('fx');
  }

  createRepairEffect(position: { x: number; y: number }, size: number = 48, life: number = 0.5): void {
    this.effects.push(this.createEffect(position, size, life, 'repair'));
  }

  createSellEffect(position: { x: number; y: number }, size: number = 48, life: number = 0.5): void {
    this.effects.push(this.createEffect(position, size, life, 'sell'));
  }

  private createEffect(
    position: { x: number; y: number },
    size: number,
    life: number,
    kind: EffectKind
  ): BuilderEffect {
    const sparkles = this.generateSparkles(position, 8 + Math.floor(size / 8), kind);
    return {
      kind,
      position: { ...position },
      size: 0,
      maxSize: size,
      life,
      maxLife: life,
      color: this.getRandomColor(kind),
      sparkles
    };
  }

  private generateSparkles(position: { x: number; y: number }, count: number, kind: EffectKind): Sparkle[] {
    const colors =
      kind === 'repair'
        ? ['#00ffff', '#66ffcc', '#66ccff', '#33ffee', '#ccffff']
        : ['#ff6666', '#ff3333', '#ff9999', '#ff4444', '#ff2200'];

    const sparkles: Sparkle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      sparkles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1 + Math.random() * 2,
        life: 0.4 + Math.random() * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    return sparkles;
  }

  update(dt: number): void {
    for (const effect of this.effects) {
      effect.life -= dt;
      const progress = 1 - effect.life / effect.maxLife;
      effect.size =
        progress < 0.5
          ? effect.maxSize * (progress * 2)
          : effect.maxSize * (1 - (progress - 0.5) * 2);

      for (const s of effect.sparkles) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
      }

      effect.sparkles = effect.sparkles.filter(s => s.life > 0);
    }

    this.effects = this.effects.filter(e => e.life > 0);
  }

  render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.camera.getZoom(), this.camera.getZoom());

    for (const effect of this.effects) {
      const screen = this.camera.worldToScreen(effect.position.x, effect.position.y);
      const x = screen.x / this.camera.getZoom();
      const y = screen.y / this.camera.getZoom();
      const alpha = effect.life / effect.maxLife;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, effect.size);
      gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
      gradient.addColorStop(0.3, effect.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, effect.size, 0, Math.PI * 2);
      ctx.fill();

      for (const s of effect.sparkles) {
        const ss = this.camera.worldToScreen(s.x, s.y);
        ctx.globalAlpha = s.life;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(ss.x / this.camera.getZoom(), ss.y / this.camera.getZoom(), s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private getRandomColor(kind: EffectKind): string {
    const palettes = {
      repair: [
        'rgba(100, 255, 255, 0.8)',
        'rgba(100, 255, 200, 0.8)',
        'rgba(150, 255, 240, 0.8)',
        'rgba(120, 255, 220, 0.8)',
      ],
      sell: [
        'rgba(255, 100, 100, 0.8)',
        'rgba(255, 80, 80, 0.8)',
        'rgba(255, 120, 120, 0.8)',
        'rgba(255, 60, 60, 0.8)',
      ]
    };
    const palette = palettes[kind];
    return palette[Math.floor(Math.random() * palette.length)];
  }
}
