// src/scenes/debriefing/entities/FlyInLabel.ts

import { getUniformScaleFactor } from '@/config/view';
import { drawLabel } from '@/ui/primitives/UILabel';

export type FlyInLabelPhase = 'hidden' | 'sliding-in' | 'settling' | 'appeared';

export class FlyInLabel {
  private originalText: string;
  private labelPrefix: string;
  private displayedValue: number | undefined;
  private targetX: number;
  private y: number;
  private textColor: string | undefined;

  private phase: FlyInLabelPhase = 'hidden';
  private x: number;
  private settleTimer: number = 0;

  private readonly slideSpeed: number;
  private readonly settleDuration = 0.2;
  private readonly overshoot = 20;

  private isActive: boolean = false;

  constructor(
    text: string,
    targetX: number,
    y: number,
    slideSpeed?: number,
    textColor?: string
  ) {
    this.originalText = text;
    this.targetX = targetX;
    this.y = y;
    this.slideSpeed = slideSpeed ?? 1200;
    this.textColor = textColor;

    const scale = getUniformScaleFactor();
    this.x = targetX - 200 * scale;

    // Parse optional dynamic value from label (format: "Label: 123")
    const split = text.split(':');
    const maybeValue = split[1]?.trim();

    this.labelPrefix = split[0].trim();
    this.displayedValue =
      maybeValue !== undefined && /^\d+$/.test(maybeValue)
        ? parseInt(maybeValue)
        : undefined;
  }

  trigger(): void {
    if (this.phase === 'hidden') {
      this.phase = 'sliding-in';
    }
  }

  setActive(active: boolean): void {
    this.isActive = active;
  }

  update(dt: number): void {
    switch (this.phase) {
      case 'sliding-in': {
        const overshootX = this.targetX + this.overshoot;
        const direction = Math.sign(overshootX - this.x);
        this.x += direction * this.slideSpeed * dt;

        if (
          (direction > 0 && this.x >= overshootX) ||
          (direction < 0 && this.x <= overshootX)
        ) {
          this.x = overshootX;
          this.phase = 'settling';
          this.settleTimer = this.settleDuration;
        }
        break;
      }

      case 'settling': {
        this.settleTimer -= dt;
        const progress = 1 - Math.max(0, this.settleTimer / this.settleDuration);
        this.x = this.targetX + this.overshoot * (1 - progress);
        if (this.settleTimer <= 0) {
          this.x = this.targetX;
          this.phase = 'appeared';
        }
        break;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.phase === 'hidden') return;

    const scale = getUniformScaleFactor();

    drawLabel(ctx, this.x * scale, this.y * scale, this.getRenderedText(), {
      font: `${Math.round(18 * scale)}px monospace`,
      color: this.textColor ?? (this.isActive ? '#ffffff' : '#00ff00'),
      glow: true,
      align: 'left',
    });
  }

  getRenderedText(): string {
    if (this.displayedValue !== undefined) {
      return `${this.labelPrefix}: ${this.displayedValue}`;
    }
    return this.originalText;
  }

  decrementDynamic(amount: number): boolean {
    if (this.displayedValue === undefined || this.displayedValue <= 0) return false;
    this.displayedValue = Math.max(0, this.displayedValue - amount);
    return true;
  }

  isAppeared(): boolean {
    return this.phase === 'appeared';
  }
}
