// src/ui/components/AnimatedLabel.ts

import { drawLabel, LabelDrawOptions } from '@/ui/primitives/UILabel';

export class AnimatedLabel {
  private text: string;
  private x: number;
  private y: number;
  private options: LabelDrawOptions;
  private duration: number;

  private timer: number = 0;
  private triggered: boolean = false;

  constructor(
    text: string,
    x: number,
    y: number,
    options: LabelDrawOptions,
    duration: number = 0.8
  ) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.options = options;
    this.duration = duration;
  }

  trigger() {
    this.timer = 0;
    this.triggered = true;
  }

  public hasTriggered(): boolean {
    return this.triggered;
  }

  update(dt: number) {
    if (!this.triggered) return;
    this.timer += dt;
  }

  render(ctx: CanvasRenderingContext2D, scale: number) {
    if (!this.triggered) return;

    const t = Math.min(this.timer / this.duration, 1);
    const eased = t * t * (3 - 2 * t); // smoothstep

    const alpha = eased;
    const zoom = 1.0 + (1.0 - eased) * 0.4; // zoom in from 1.4

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(zoom, zoom);
    drawLabel(
      ctx,
      0,
      0,
      this.text,
      {
        ...this.options,
        align: 'center',
        alpha,
      },
      scale
    );
    ctx.restore();
  }

  public hasCompleted(): boolean {
    return this.triggered && this.timer >= this.duration;
  }
}
