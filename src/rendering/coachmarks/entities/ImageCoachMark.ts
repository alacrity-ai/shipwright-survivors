// src/rendering/coachmarks/entities/ImageCoachMark.ts

import { CoachMarkEntity, CoachMarkPositionResolver } from '@/rendering/coachmarks/CoachMarkEntity';
import type { ImageCoachMarkBehavior } from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';

import { getUniformScaleFactor } from '@/config/view';

export class ImageCoachMark extends CoachMarkEntity {
  protected behavior: ImageCoachMarkBehavior;
  private image: HTMLImageElement;

  constructor(
    getPos: CoachMarkPositionResolver,
    behavior: ImageCoachMarkBehavior
  ) {
    super(getPos, behavior);
    this.behavior = behavior;

    this.image = new Image();
    this.image.src = behavior.imageSrc;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.image.complete) return;

    const pos = this.getPosition();
    const scale = getUniformScaleFactor();

    const width = (this.behavior.imageWidth ?? this.image.width) * scale;
    const height = (this.behavior.imageHeight ?? this.image.height) * scale;

    ctx.drawImage(this.image, pos.x - width / 2, pos.y - height / 2, width, height);
  }
}
