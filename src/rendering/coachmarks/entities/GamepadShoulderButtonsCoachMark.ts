// src/rendering/coachmarks/entities/GamepadShoulderButtonsCoachMark.ts

import { CoachMarkEntity, CoachMarkPositionResolver } from '@/rendering/coachmarks/CoachMarkEntity';
import type {
  GamepadShoulderButtonsCoachMarkBehavior,
  GamepadShoulderButton
} from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';
import { getUniformScaleFactor } from '@/config/view';

export class GamepadShoulderButtonsCoachMark extends CoachMarkEntity {
  protected behavior: GamepadShoulderButtonsCoachMarkBehavior;
  private animationTimer: number = 0;

  constructor(getPos: CoachMarkPositionResolver, behavior: GamepadShoulderButtonsCoachMarkBehavior) {
    super(getPos, behavior);
    this.behavior = behavior;
  }

  override update(dt: number): void {
    super.update(dt);
    this.animationTimer += dt;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const base = this.getPosition();
    const scale = getUniformScaleFactor();
    const x = base.x * scale;
    const y = base.y * scale;

    const width = (this.behavior.width ?? 160) * scale;
    const height = (this.behavior.height ?? 80) * scale;
    const borderColor = this.behavior.borderColor ?? '#FFFFFF';
    const fillColor = this.behavior.fillColor ?? '#222222';
    const highlightColor = this.behavior.highlightColor ?? '#00FFFF';
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTimer * Math.PI * 2);

    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 2;

    // Gamepad base body
    ctx.beginPath();
    ctx.strokeStyle = borderColor;
    ctx.fillStyle = fillColor;
    ctx.roundRect(-width / 2, -height / 2, width, height, 12);
    ctx.fill();
    ctx.stroke();

    // Dimensions
    const triggerW = width * 0.25;
    const triggerH = height * 0.25;
    const bumperW = width * 0.2;
    const bumperH = height * 0.15;

    // === Left Trigger ===
    drawPart(ctx,
      -width / 2 - triggerW * 0.5,
      -height * 0.3,
      triggerW,
      triggerH,
      'leftTrigger',
      highlightColor,
      fillColor,
      borderColor,
      this.behavior.highlighted
    );

    // === Right Trigger ===
    drawPart(ctx,
      width / 2 - triggerW * 0.5,
      -height * 0.3,
      triggerW,
      triggerH,
      'rightTrigger',
      highlightColor,
      fillColor,
      borderColor,
      this.behavior.highlighted
    );

    // === Left Bumper ===
    drawPart(ctx,
      -width / 2 + bumperW * 0.5,
      -height / 2 - bumperH * 0.5,
      bumperW,
      bumperH,
      'leftBumper',
      highlightColor,
      fillColor,
      borderColor,
      this.behavior.highlighted
    );

    // === Right Bumper ===
    drawPart(ctx,
      width / 2 - bumperW * 1.5,
      -height / 2 - bumperH * 0.5,
      bumperW,
      bumperH,
      'rightBumper',
      highlightColor,
      fillColor,
      borderColor,
      this.behavior.highlighted
    );

    ctx.restore();

    function drawPart(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      button: GamepadShoulderButton,
      highlightColor: string,
      baseColor: string,
      strokeColor: string,
      highlighted: GamepadShoulderButton[]
    ) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 4);
      ctx.fillStyle = highlighted.includes(button)
        ? applyAlpha(highlightColor, pulse)
        : baseColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
  }
}

function applyAlpha(hexColor: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamped.toFixed(2)})`;
}
