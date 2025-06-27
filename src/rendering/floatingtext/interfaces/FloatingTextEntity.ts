// src/rendering/floatingtext/interfaces/FloatingTextEntity.ts

import type { FloatingTextBehaviorOptions } from '@/rendering/floatingtext/interfaces/FloatingTextBehaviorOptions';
import { getUniformScaleFactor } from '@/config/view';

export type FloatingTextPositionResolver = () => { x: number, y: number };

// === Animation Constants ===
const NEON_COLOR_CYCLE = [
  '#FF00FF', // magenta
  '#00FFFF', // cyan
  '#FFFF00', // yellow
  '#00FF00', // lime
  '#FF0000', // red
  '#00CCFF', // light blue
  '#FF8800', // orange
];

const COLOR_CYCLE_INTERVAL = 0.05;         // seconds per color frame
const IMPACT_SCALE_DURATION = 0.35;        // seconds to ease back to base size

export class FloatingTextEntity {
  private elapsed: number = 0;
  private yOffset: number = 0;
  private readonly originalFontSize: number;

  private colorCycleIndex: number = 0;
  private colorCycleTimer: number = 0;

  constructor(
    public text: string,
    private getPosition: FloatingTextPositionResolver,
    public fontSize: number,
    public fontFamily: string,
    public life: number,
    public speed: number,
    public alpha: number,
    public color: string,
    public behavior?: FloatingTextBehaviorOptions
  ) {
    this.originalFontSize = fontSize;

    // Initialize multiColor state
    if (this.behavior?.multiColor) {
      this.colorCycleIndex = Math.floor(Math.random() * NEON_COLOR_CYCLE.length);
      this.color = NEON_COLOR_CYCLE[this.colorCycleIndex];
    }
  }

  public update(dt: number): void {
    this.elapsed += dt;
    this.yOffset -= this.speed * dt;

    // === Impact scale logic ===
    if (this.behavior?.impactScale) {
      const t = Math.min(this.elapsed / IMPACT_SCALE_DURATION, 1);
      const scale = 1 + (this.behavior.impactScale - 1) * (1 - t);
      this.fontSize = this.originalFontSize * scale;
    }

    // === MultiColor cycling ===
    if (this.behavior?.multiColor) {
      this.colorCycleTimer += dt;
      if (this.colorCycleTimer >= COLOR_CYCLE_INTERVAL) {
        this.colorCycleTimer -= COLOR_CYCLE_INTERVAL;
        this.colorCycleIndex = (this.colorCycleIndex + 1) % NEON_COLOR_CYCLE.length;
        this.color = NEON_COLOR_CYCLE[this.colorCycleIndex];
      }
    }

    // === Fade-out logic ===
    if (this.behavior?.fadeOut !== false) {
      const remaining = Math.max(0, this.life - this.elapsed);
      this.alpha = Math.min(1, remaining / this.life);
    }
  }

  public isExpired(): boolean {
    return this.elapsed >= this.life;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const scale = getUniformScaleFactor();
    const pos = this.getPosition();
    const renderY = pos.y + this.yOffset;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.font = `${Math.round(this.fontSize * scale)}px ${this.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, pos.x, renderY);
    ctx.restore();
  }
}
