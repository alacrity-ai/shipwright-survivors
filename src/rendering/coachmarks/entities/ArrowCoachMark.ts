// src/rendering/coachmarks/entities/ArrowCoachMark.ts

import { CoachMarkEntity, CoachMarkPositionResolver } from '@/rendering/coachmarks/CoachMarkEntity';
import type { ArrowCoachMarkBehavior } from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';

import { getUniformScaleFactor } from '@/config/view';

export class ArrowCoachMark extends CoachMarkEntity {
  protected behavior: ArrowCoachMarkBehavior;

  constructor(
    getPos: CoachMarkPositionResolver,
    behavior: ArrowCoachMarkBehavior
  ) {
    super(getPos, behavior);
    this.behavior = behavior;
  }

  // TODO : Double check scaling logic here
  render(ctx: CanvasRenderingContext2D): void {
    const pos = this.getPosition();
    const scale = getUniformScaleFactor();

    const angle = this.resolveArrowAngle();
    const len = (this.behavior.arrowLength ?? 30) * scale;

    const endX = pos.x + len * Math.cos(angle);
    const endY = pos.y + len * Math.sin(angle);

    ctx.save();
    ctx.strokeStyle = this.behavior.arrowColor ?? '#ffffff';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(pos.x * scale, pos.y * scale);
    ctx.stroke();
    ctx.restore();
  }

  private resolveArrowAngle(): number {
    switch (this.behavior.arrowDirection) {
      case 'up': return -Math.PI / 2;
      case 'down': return Math.PI / 2;
      case 'left': return Math.PI;
      case 'right': return 0;
      default: return 0;
    }
  }
}
