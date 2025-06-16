// src/rendering/coachmarks/entities/TextCoachMark.ts

import type { TextCoachMarkBehavior } from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';
import { CoachMarkEntity, CoachMarkPositionResolver } from '@/rendering/coachmarks/CoachMarkEntity';
import { getUniformScaleFactor } from '@/config/view';

export class TextCoachMark extends CoachMarkEntity {
  protected behavior: TextCoachMarkBehavior;
  private label: string;

  constructor(
    label: string,
    getPos: CoachMarkPositionResolver,
    behavior: TextCoachMarkBehavior
  ) {
    super(getPos, behavior);
    this.behavior = behavior;
    this.label = label;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pos = this.getPosition();
    const scale = getUniformScaleFactor();
    const fontSize = (this.behavior.fontSize ?? 14) * scale;
    const offset = this.behavior.labelOffset ?? { x: 0, y: -30 };

    ctx.save();
    ctx.font = `${Math.round(fontSize)}px ${this.behavior.fontFamily ?? 'monospace'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.behavior.textColor ?? '#FFFFFF';
    ctx.fillText(this.label, pos.x + offset.x, pos.y + offset.y);
    ctx.restore();
  }
}
