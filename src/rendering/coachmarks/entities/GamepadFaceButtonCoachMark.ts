// src/rendering/coachmarks/entities/GamePadFaceButtonCoachMark.ts

import { CoachMarkEntity, CoachMarkPositionResolver } from '@/rendering/coachmarks/CoachMarkEntity';
import type { GamepadFaceButtonCoachMarkBehavior } from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';
import { getUniformScaleFactor } from '@/config/view';

export class GamePadFaceButtonCoachMark extends CoachMarkEntity {
  protected behavior: GamepadFaceButtonCoachMarkBehavior;
  private animationTimer = 0;

  // Configurable pulse constants
  private readonly pulseMinAlpha = 0.3;
  private readonly pulseMaxAlpha = 0.7;
  private readonly pulseFrequencyHz = 0.5; // 0.5 Hz = 2s per full cycle

  constructor(getPos: CoachMarkPositionResolver, behavior: GamepadFaceButtonCoachMarkBehavior) {
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

    const radius = (this.behavior.radius ?? 50) * scale;
    const fontSize = (this.behavior.fontSize ?? 18) * scale;

    const borderColor = this.behavior.borderColor ?? '#FFFFFF';
    const highlightColor = this.behavior.highlightColor ?? '#00FFFF';
    const textColor = this.behavior.textColor ?? '#FFFFFF';

    const sin = Math.sin(this.animationTimer * this.pulseFrequencyHz * Math.PI * 2); // range -1 to 1
    const normalized = 0.5 + 0.5 * sin; // range 0 to 1
    const pulse = this.pulseMinAlpha + normalized * (this.pulseMaxAlpha - this.pulseMinAlpha); // range min to max
    const effectiveFill = applyAlpha(highlightColor, pulse);

    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 2 * scale;

    // Outer circle
    ctx.beginPath();
    ctx.fillStyle = effectiveFill;
    ctx.strokeStyle = borderColor;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Button label
    ctx.fillStyle = textColor;
    ctx.font = `${Math.round(fontSize)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.behavior.label, 0, 0);

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
