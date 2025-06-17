// src/rendering/coachmarks/entities/BoxCoachMark.ts

import { CoachMarkEntity, CoachMarkPositionResolver } from '@/rendering/coachmarks/CoachMarkEntity';
import { getUniformScaleFactor } from '@/config/view';
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
    const rawPos = this.getPosition();
    
    const scale = getUniformScaleFactor();
    
    const rawWidth = this.behavior.boxWidth ?? 100;
    const rawHeight = this.behavior.boxHeight ?? 40;
    const width = rawWidth * scale;
    const height = rawHeight * scale;

    const pos = {
      x: rawPos.x * scale,
      y: rawPos.y * scale
    };

    ctx.save();
    ctx.strokeStyle = this.behavior.boxStrokeColor ?? '#ffffff';
    ctx.lineWidth = this.behavior.boxLineWidth ?? 2 * getUniformScaleFactor();
    ctx.strokeRect(pos.x - width / 2, pos.y - height / 2, width, height);
    ctx.restore();
  }
}
