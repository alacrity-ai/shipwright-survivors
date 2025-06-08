// src/ui/primitives/CRTMonitor.ts

export interface CRTMonitorOptions {
  borderRadius?: number;
  backgroundColor?: string;
  borderColor?: string;
  alpha?: number;
  glowColor?: string;
  scanlineSpacing?: number;
  backgroundGradient?: {
    type: 'linear' | 'radial';
    stops: { offset: number; color: string }[];
    from?: [number, number];
    to?: [number, number];
    radius?: number;
  };
}

export class CRTMonitor {
  private scanlineOffset = 0;
  private lastTime = 0;

  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number,
    private readonly options: CRTMonitorOptions = {}
  ) {}

  update(currentTime: number): void {
    if (this.lastTime === 0) this.lastTime = currentTime;
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;

    const spacing = this.options.scanlineSpacing ?? 6;
    this.scanlineOffset = (this.scanlineOffset + delta * 0.03) % spacing;
  }

  draw(ctx: CanvasRenderingContext2D, uiScale: number = 1.0): void {
    const {
      borderRadius = 10,
      backgroundColor = '#000a00',
      borderColor = '#00ff41',
      glowColor = '#00ff41',
      alpha = 1.0,
      scanlineSpacing = 6,
      backgroundGradient,
    } = this.options;

    ctx.save();
    ctx.globalAlpha = alpha;

    // === Fill Background ===
    let fillStyle: string | CanvasGradient = backgroundColor;

    if (backgroundGradient) {
      const { type, stops, from = [this.x, this.y], to = [this.x + (this.width * uiScale), this.y + (this.height * uiScale)], radius = (this.width * uiScale) / 2 } = backgroundGradient;
      const gradient = type === 'linear'
        ? ctx.createLinearGradient(from[0], from[1], to[0], to[1])
        : ctx.createRadialGradient(from[0], from[1], 0, from[0], from[1], radius);

      for (const stop of stops) {
        gradient.addColorStop(stop.offset, stop.color);
      }

      fillStyle = gradient;
    }

    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width * uiScale, this.height * uiScale, borderRadius);
    ctx.fill();
    ctx.stroke();

    // === Draw Scanlines ===
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = glowColor;

    for (let i = -this.scanlineOffset; i < this.height * uiScale; i += scanlineSpacing) {
      ctx.fillRect(this.x, this.y + i, this.width * uiScale, 1);
    }

    ctx.restore();
  }
}
