// src/rendering/coachmarks/entities/GamepadSticksCoachMark.ts

import { CoachMarkEntity, CoachMarkPositionResolver } from '@/rendering/coachmarks/CoachMarkEntity';
import type {
  GamepadSticksCoachMarkBehavior,
  GamepadStickSide
} from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';
import { getUniformScaleFactor } from '@/config/view';

export class GamepadSticksCoachMark extends CoachMarkEntity {
  protected behavior: GamepadSticksCoachMarkBehavior;
  private animationTimer: number = 0;

  constructor(getPos: CoachMarkPositionResolver, behavior: GamepadSticksCoachMarkBehavior) {
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

    const width = (this.behavior.width ?? 120) * scale;
    const height = (this.behavior.height ?? 60) * scale;
    const stickRadius = 12 * scale;
    const wiggleAmount = 5 * scale;
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTimer * Math.PI * 2);

    const borderColor = this.behavior.borderColor ?? '#FFFFFF';
    const fillColor = this.behavior.fillColor ?? '#222222';
    const highlightColor = this.behavior.highlightColor ?? '#00FFFF';

    const { highlightStick, wiggleStick } = this.behavior;

    const leftStickPulse = highlightStick === 'left' ? pulse : 0;
    const rightStickPulse = highlightStick === 'right' ? pulse : 0;

    const leftStickWiggle = wiggleStick === 'left' ? Math.sin(this.animationTimer * 4) * wiggleAmount : 0;
    const rightStickWiggle = wiggleStick === 'right' ? Math.sin(this.animationTimer * 4) * wiggleAmount : 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 2;

    // === Draw Gamepad Body ===
    ctx.beginPath();
    ctx.strokeStyle = borderColor;
    ctx.fillStyle = fillColor;
    ctx.roundRect(-width / 2, -height / 2, width, height, 12);
    ctx.fill();
    ctx.stroke();

    // === Draw Left Stick ===
    const leftX = -width * 0.3 + leftStickWiggle;
    const stickY = 0;

    ctx.beginPath();
    ctx.arc(leftX, stickY, stickRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.behavior.highlightStick === 'left'
      ? applyAlpha(highlightColor, leftStickPulse)
      : '#444444';
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    // === Draw Right Stick ===
    const rightX = width * 0.3 + rightStickWiggle;

    ctx.beginPath();
    ctx.arc(rightX, stickY, stickRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.behavior.highlightStick === 'right'
      ? applyAlpha(highlightColor, rightStickPulse)
      : '#444444';
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    ctx.restore();
  }
}

function applyAlpha(hexColor: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamped.toFixed(2)})`;
}