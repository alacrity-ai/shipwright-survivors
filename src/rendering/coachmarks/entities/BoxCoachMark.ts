// src/rendering/coachmarks/entities/BoxCoachMark.ts

import { CoachMarkEntity, CoachMarkPositionResolver } from '@/rendering/coachmarks/CoachMarkEntity';
import type { BoxCoachMarkBehavior } from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';

export class BoxCoachMark extends CoachMarkEntity {
  protected behavior: BoxCoachMarkBehavior;

  constructor(
    getPos: CoachMarkPositionResolver,
    behavior: BoxCoachMarkBehavior
  ) {
    super(getPos, behavior);
    this.behavior = behavior;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pos = this.getPosition();
    const width = this.behavior.boxWidth ?? 100;
    const height = this.behavior.boxHeight ?? 40;

    ctx.save();
    ctx.strokeStyle = this.behavior.boxStrokeColor ?? '#ffffff';
    ctx.lineWidth = this.behavior.boxLineWidth ?? 2;
    ctx.strokeRect(pos.x - width / 2, pos.y - height / 2, width, height);
    ctx.restore();
  }
}
