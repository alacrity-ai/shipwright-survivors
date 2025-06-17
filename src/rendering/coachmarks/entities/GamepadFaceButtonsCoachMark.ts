// src/rendering/coachmarks/entities/GamepadFaceButtonsCoachMark.ts

import { CoachMarkEntity, CoachMarkPositionResolver } from '@/rendering/coachmarks/CoachMarkEntity';
import type { GamepadFaceButtonsCoachMarkBehavior, GamepadFaceButton } from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';
import { getUniformScaleFactor } from '@/config/view';

export class GamepadFaceButtonsCoachMark extends CoachMarkEntity {
  protected behavior: GamepadFaceButtonsCoachMarkBehavior;
  private animationTimer = 0;

  constructor(getPos: CoachMarkPositionResolver, behavior: GamepadFaceButtonsCoachMarkBehavior) {
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

    const radius = (this.behavior.radius ?? 60) * scale;
    const fontSize = (this.behavior.fontSize ?? 16) * scale;

    const borderColor = this.behavior.borderColor ?? '#FFFFFF';
    const fillColor = this.behavior.fillColor ?? '#222222';
    const highlightColor = this.behavior.highlightColor ?? '#00FFFF';
    const textColor = this.behavior.textColor ?? '#FFFFFF';

    const pulse = 0.5 + 0.5 * Math.sin(this.animationTimer * Math.PI * 2); // 0–1
    const highlight = (btn: GamepadFaceButton): string =>
      this.behavior.highlightButton === btn
        ? applyAlpha(highlightColor, pulse)
        : fillColor;

    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 2 * scale;

    // === Draw circular base ===
    ctx.beginPath();
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = borderColor;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // === Face buttons ===
    const faceRadius = radius * 0.25;
    const offset = radius * 0.5;

    const buttonPositions: Record<GamepadFaceButton, [number, number]> = {
      'Y': [0, -offset],
      'A': [0, offset],
      'X': [-offset, 0],
      'B': [offset, 0],
    };

    const drawButton = (label: GamepadFaceButton) => {
      const [bx, by] = buttonPositions[label];
      ctx.beginPath();
      ctx.fillStyle = highlight(label);
      ctx.strokeStyle = borderColor;
      ctx.arc(bx, by, faceRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = `${Math.round(fontSize)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx, by);
    };

    drawButton('A');
    drawButton('B');
    drawButton('X');
    drawButton('Y');

    ctx.restore();
  }
}

// Shared utility
function applyAlpha(hexColor: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamped.toFixed(2)})`;
}
