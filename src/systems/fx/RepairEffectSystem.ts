// src/systems/fx/RepairEffectSystem.ts

import type { IUpdatable, IRenderable } from '@/core/interfaces/types';

import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';

interface RepairPulse {
  position: { x: number; y: number };
  size: number;
  maxSize: number;
  life: number;
  maxLife: number;
  color: string;
  sparkles: Sparkle[];
}

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
}

export class RepairEffectSystem implements IUpdatable, IRenderable {
  runWhilePaused: boolean;

  private effects: RepairPulse[] = [];
  private ctx: CanvasRenderingContext2D;

  constructor(
    canvasManager: CanvasManager,
    private readonly camera: Camera
  ) {
    this.ctx = canvasManager.getContext('fx');
    this.runWhilePaused = true;
  }

  createRepairEffect(position: { x: number; y: number }, size: number = 48, life: number = 0.5): void {
    const sparkles = this.generateSparkles(position, 8 + Math.floor(size / 8));
    this.effects.push({
      position: { ...position },
      size: 0,
      maxSize: size,
      life,
      maxLife: life,
      color: this.getRandomRepairColor(),
      sparkles
    });
  }

  private generateSparkles(position: { x: number; y: number }, count: number): Sparkle[] {
    const sparkles: Sparkle[] = [];
    const colors = ['#00ffff', '#66ffcc', '#66ccff', '#33ffee', '#ccffff'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = 0.4 + Math.random() * 0.4;
      const size = 1 + Math.random() * 2;

      sparkles.push({
        x: position.x,
        y: position.y,
        vx,
        vy,
        size,
        life,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    return sparkles;
  }

  update(dt: number): void {
    for (const effect of this.effects) {
      effect.life -= dt;

      const progress = 1 - (effect.life / effect.maxLife);
      if (progress < 0.5) {
        effect.size = effect.maxSize * (progress * 2);
      } else {
        effect.size = effect.maxSize * (1 - (progress - 0.5) * 2);
      }

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
      gradient.addColorStop(0, `rgba(100,255,255,${alpha})`);
      gradient.addColorStop(0.3, effect.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, effect.size, 0, Math.PI * 2);
      ctx.fill();

      for (const s of effect.sparkles) {
        const screenSpark = this.camera.worldToScreen(s.x, s.y);
        const sx = screenSpark.x / this.camera.getZoom();
        const sy = screenSpark.y / this.camera.getZoom();

        ctx.globalAlpha = s.life;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private getRandomRepairColor(): string {
    const palette = [
      'rgba(100, 255, 255, 0.8)',
      'rgba(100, 255, 200, 0.8)',
      'rgba(150, 255, 240, 0.8)',
      'rgba(120, 255, 220, 0.8)',
    ];
    return palette[Math.floor(Math.random() * palette.length)];
  }
}
