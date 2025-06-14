import type { FloatingTextBehaviorOptions } from '@/rendering/floatingtext/interfaces/FloatingTextBehaviorOptions';

import { getUniformScaleFactor } from '@/config/view';

export type FloatingTextPositionResolver = () => { x: number, y: number };

export class FloatingTextEntity {
  private elapsed: number = 0;
  private yOffset: number = 0;
  private readonly originalFontSize: number; // Store the original size

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
    this.originalFontSize = fontSize; // Capture the original size
  }

  public update(dt: number): void {
    this.elapsed += dt;
    this.yOffset -= this.speed * dt;

    // Don't modify this.fontSize directly - calculate it fresh each time
    if (this.behavior?.impactScale) {
      const t = Math.min(this.elapsed / 0.15, 1); // Normalize 0–1
      const scale = 1 + (this.behavior.impactScale - 1) * (1 - t);
      this.fontSize = this.originalFontSize * scale; // Calculate from original
    }

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