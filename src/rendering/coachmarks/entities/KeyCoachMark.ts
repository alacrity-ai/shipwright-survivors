// src/rendering/coachmarks/entities/KeyCoachMark.ts

import { CoachMarkEntity, CoachMarkPositionResolver } from '@/rendering/coachmarks/CoachMarkEntity';
import type { KeyCoachMarkBehavior } from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';
import { getUniformScaleFactor } from '@/config/view';

export class KeyCoachMark extends CoachMarkEntity {
  protected behavior: KeyCoachMarkBehavior;
  private floatTimer: number = 0;

  constructor(
    getPos: CoachMarkPositionResolver,
    behavior: KeyCoachMarkBehavior
  ) {
    super(getPos, behavior);
    this.behavior = behavior;
  }

  override update(dt: number): void {
    super.update(dt);
    this.floatTimer += dt;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const base = this.getPosition();
    const scale = getUniformScaleFactor();

    // Floating offset
    const floatY = Math.sin(this.floatTimer * 2 * Math.PI) * 5;

    // Style parameters
    const defaultWidth = (this.behavior.width ?? 36) * scale;
    const height = (this.behavior.height ?? 36) * scale;
    const fontSize = (this.behavior.fontSize ?? 18) * scale;

    const borderColor = this.behavior.borderColor ?? '#FFFFFF';
    const fillColor = this.behavior.fillColor ?? '#222222';
    const textColor = this.behavior.textColor ?? '#FFFFFF';
    const keyLabel = this.behavior.keyLabel;

    const x = base.x * scale;
    const y = (base.y + floatY) * scale;

    ctx.save();

    // Measure label width
    ctx.font = `${Math.round(fontSize)}px monospace`;
    const textWidth = ctx.measureText(keyLabel).width;
    const padding = 12 * scale; // horizontal padding
    const minWidth = defaultWidth;
    const boxWidth = Math.max(minWidth, textWidth + padding * 2);

    // Draw key background
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - boxWidth / 2, y - height / 2, boxWidth, height, 6);
    ctx.fill();
    ctx.stroke();

    // Draw key label
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(keyLabel, x, y);

    ctx.restore();
  }
}
