// src/rendering/coachmarks/entities/MouseCoachMark.ts

import {
  CoachMarkEntity,
  CoachMarkPositionResolver,
} from '@/rendering/coachmarks/CoachMarkEntity';
import type {
  MouseCoachMarkBehavior,
  MouseInteractionMode,
} from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';
import { getUniformScaleFactor } from '@/config/view';

export class MouseCoachMark extends CoachMarkEntity {
  protected behavior: MouseCoachMarkBehavior;
  private animationTimer: number = 0;

  constructor(getPos: CoachMarkPositionResolver, behavior: MouseCoachMarkBehavior) {
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

    const width = (this.behavior.width ?? 50) * scale;
    const height = (this.behavior.height ?? 80) * scale;

    const borderColor = this.behavior.borderColor ?? '#FFFFFF';
    const fillColor = this.behavior.fillColor ?? '#222222';
    const highlightColor = this.behavior.highlightColor ?? '#00FFFF';

    // Determine animation states
    const mode: MouseInteractionMode = this.behavior.interactionMode;
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTimer * Math.PI * 2); // Range: 0–1
    const offsetX = mode === 'wiggle' ? Math.sin(this.animationTimer * 6) * 6 : 0;

    ctx.save();
    ctx.translate(x + offsetX, y);
    ctx.lineWidth = 2;

    // === Mouse Body ===
    ctx.beginPath();
    ctx.strokeStyle = borderColor;
    ctx.fillStyle = fillColor;
    ctx.roundRect(-width / 2, -height / 2, width, height, 12);
    ctx.fill();
    ctx.stroke();

    // === Button Zones ===
    const buttonHeight = height * 0.25;
    const buttonWidth = width * 0.4;
    const leftX = -width * 0.45;
    const rightX = width * 0.05;
    const buttonY = -height / 2 + buttonHeight / 2 + 4;

    // Left Button
    ctx.beginPath();
    ctx.roundRect(leftX, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 4);
    ctx.fillStyle = (mode === 'leftClick')
      ? applyAlpha(highlightColor, pulse)
      : fillColor;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    // Right Button
    ctx.beginPath();
    ctx.roundRect(rightX, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 4);
    ctx.fillStyle = (mode === 'rightClick')
      ? applyAlpha(highlightColor, pulse)
      : fillColor;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    // === Wheel ===
    const wheelRadius = 6 * scale;
    const wheelY = buttonY + buttonHeight / 2 + 12;
    ctx.beginPath();
    ctx.arc(0, wheelY, wheelRadius, 0, Math.PI * 2);
    ctx.fillStyle = (mode === 'scroll')
      ? applyAlpha(highlightColor, pulse)
      : '#888888';
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
