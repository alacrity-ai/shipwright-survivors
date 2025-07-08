// // src/rendering/floatingtext/interfaces/FloatingTextEntity.ts

// import type { FloatingTextBehaviorOptions } from '@/rendering/floatingtext/interfaces/FloatingTextBehaviorOptions';
// import { getUniformScaleFactor } from '@/config/view';

// export type FloatingTextPositionResolver = () => { x: number, y: number };

// // === Animation Constants ===
// const NEON_COLOR_CYCLE = [
//   '#FF00FF', // magenta
//   '#00FFFF', // cyan
//   '#FFFF00', // yellow
//   '#00FF00', // lime
//   '#FF0000', // red
//   '#00CCFF', // light blue
//   '#FF8800', // orange
// ];

// const COLOR_CYCLE_INTERVAL = 0.05;         // seconds per color frame
// const IMPACT_SCALE_DURATION = 0.35;        // seconds to ease back to base size

// export class FloatingTextEntity {
//   private elapsed: number = 0;
//   private yOffset: number = 0;
//   private readonly originalFontSize: number;

//   private colorCycleIndex: number = 0;
//   private colorCycleTimer: number = 0;

//   private cachedFontString: string | null = null;
//   private cachedFontSizePx: number = -1;

//   constructor(
//     public text: string,
//     private getPosition: FloatingTextPositionResolver,
//     public fontSize: number,
//     public fontFamily: string,
//     public life: number,
//     public speed: number,
//     public alpha: number,
//     public color: string,
//     public behavior?: FloatingTextBehaviorOptions
//   ) {
//     this.originalFontSize = fontSize;

//     // Initialize multiColor state
//     if (this.behavior?.multiColor) {
//       this.colorCycleIndex = Math.floor(Math.random() * NEON_COLOR_CYCLE.length);
//       this.color = NEON_COLOR_CYCLE[this.colorCycleIndex];
//     }
//   }

//   public update(dt: number): void {
//     this.elapsed += dt;
//     this.yOffset -= this.speed * dt;

//     // === Impact scale logic ===
//     if (this.behavior?.impactScale) {
//       const t = Math.min(this.elapsed / IMPACT_SCALE_DURATION, 1);
//       const scale = 1 + (this.behavior.impactScale - 1) * (1 - t);
//       this.fontSize = this.originalFontSize * scale;
//     }

//     // === MultiColor cycling ===
//     if (this.behavior?.multiColor) {
//       this.colorCycleTimer += dt;
//       if (this.colorCycleTimer >= COLOR_CYCLE_INTERVAL) {
//         this.colorCycleTimer -= COLOR_CYCLE_INTERVAL;
//         this.colorCycleIndex = (this.colorCycleIndex + 1) % NEON_COLOR_CYCLE.length;
//         this.color = NEON_COLOR_CYCLE[this.colorCycleIndex];
//       }
//     }

//     // === Fade-out logic ===
//     if (this.behavior?.fadeOut !== false) {
//       const remaining = Math.max(0, this.life - this.elapsed);
//       this.alpha = Math.min(1, remaining / this.life);
//     }
//   }

//   public isExpired(): boolean {
//     return this.elapsed >= this.life;
//   }

//   public render(ctx: CanvasRenderingContext2D, scale: number): void {
//     const pos = this.getPosition();
//     const renderY = pos.y + this.yOffset;

//     ctx.save();
//     ctx.globalAlpha = this.alpha;
//     ctx.fillStyle = this.color;
//     ctx.font = this.getFontString(scale);
//     ctx.textAlign = 'center';
//     ctx.textBaseline = 'middle';
//     ctx.fillText(this.text, pos.x, renderY);
//     ctx.restore();
//   }

//   private getFontString(scale: number): string {
//     const scaledFontSizePx = Math.round(this.fontSize * scale);

//     // Only recompute if the integer pixel size changed
//     if (scaledFontSizePx !== this.cachedFontSizePx) {
//       this.cachedFontSizePx = scaledFontSizePx;
//       this.cachedFontString = `${scaledFontSizePx}px monospace`; // hardcoded font family
//     }

//     return this.cachedFontString!;
//   }
// }

import type { FloatingTextBehaviorOptions } from '@/rendering/floatingtext/interfaces/FloatingTextBehaviorOptions';

export type FloatingTextPositionResolver = () => { x: number, y: number };

const NEON_COLOR_CYCLE = [
  '#FF00FF', '#00FFFF', '#FFFF00', '#00FF00',
  '#FF0000', '#00CCFF', '#FF8800',
];

const COLOR_CYCLE_INTERVAL = 0.05;
const IMPACT_SCALE_DURATION = 0.35;
const TEXT_CANVAS_RESOLUTION = 1;

export class FloatingTextEntity {
  private elapsed = 0;
  private yOffset = 0;
  private readonly originalFontSize: number;

  private colorCycleIndex = 0;
  private colorCycleTimer = 0;

  private cachedCanvas: HTMLCanvasElement;
  private canvasWidth = 0;
  private canvasHeight = 0;

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

    if (this.behavior?.multiColor) {
      this.colorCycleIndex = Math.floor(Math.random() * NEON_COLOR_CYCLE.length);
      this.color = NEON_COLOR_CYCLE[this.colorCycleIndex];
    }

    this.cachedCanvas = this.createTextCanvas();
  }

  private createTextCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const resolution = TEXT_CANVAS_RESOLUTION;

    const fontPx = Math.round(this.originalFontSize * resolution);
    ctx.font = `${fontPx}px ${this.fontFamily}`;
    const metrics = ctx.measureText(this.text);

    const padding = 8 * resolution;
    this.canvasWidth = Math.ceil(metrics.width) + padding * 2;
    this.canvasHeight = Math.ceil(fontPx * 1.2) + padding * 2;

    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;

    ctx.font = `${fontPx}px ${this.fontFamily}`;
    ctx.fillStyle = this.behavior?.multiColor ? '#FFFFFF' : this.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.canvasWidth / 2, this.canvasHeight / 2);

    return canvas;
  }

  public update(dt: number): void {
    this.elapsed += dt;
    this.yOffset -= this.speed * dt;

    if (this.behavior?.impactScale) {
      const t = Math.min(this.elapsed / IMPACT_SCALE_DURATION, 1);
      const scale = 1 + (this.behavior.impactScale - 1) * (1 - t);
      this.fontSize = this.originalFontSize * scale;
    }

    if (this.behavior?.multiColor) {
      this.colorCycleTimer += dt;
      if (this.colorCycleTimer >= COLOR_CYCLE_INTERVAL) {
        this.colorCycleTimer -= COLOR_CYCLE_INTERVAL;
        this.colorCycleIndex = (this.colorCycleIndex + 1) % NEON_COLOR_CYCLE.length;
        this.color = NEON_COLOR_CYCLE[this.colorCycleIndex];
        // No re-render required — overlay tint will handle color
      }
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
    const pos = this.getPosition();
    const renderY = pos.y + this.yOffset;

    const impactScale = this.fontSize / this.originalFontSize;
    const drawWidth = (this.canvasWidth / TEXT_CANVAS_RESOLUTION) * impactScale;
    const drawHeight = (this.canvasHeight / TEXT_CANVAS_RESOLUTION) * impactScale;

    const drawX = pos.x - drawWidth / 2;
    const drawY = renderY - drawHeight / 2;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // Draw base (white or mono-colored) text
    ctx.drawImage(this.cachedCanvas, drawX, drawY, drawWidth, drawHeight);

    // Apply color overlay if multiColor is active
    if (this.behavior?.multiColor) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = this.color;
      ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
    }

    ctx.restore();
  }
}
