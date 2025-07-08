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

    const sin = Math.sin(this.animationTimer * this.pulseFrequencyHz * Math.PI * 2);
    const normalized = 0.5 + 0.5 * sin;
    const pulse = this.pulseMinAlpha + normalized * (this.pulseMaxAlpha - this.pulseMinAlpha);
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

    // Label rendering
    const label = this.behavior.label;
    ctx.fillStyle = textColor;

    if (label === 'View') {
      drawViewIcon(ctx, radius * 0.4, scale);
    } else if (label === 'Menu') {
      drawMenuIcon(ctx, radius * 0.5, scale);
    } else {
      ctx.font = `${Math.round(fontSize)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 0);
    }

    ctx.restore();
  }
}

function drawViewIcon(ctx: CanvasRenderingContext2D, size: number, scale: number) {
  const offset = 4 * scale;

  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = ctx.strokeStyle; // use current stroke style

  // Top-left rectangle (back)
  ctx.beginPath();
  ctx.rect(-size * 0.5 - offset, -size * 0.5 - offset, size, size);
  ctx.stroke();

  // Bottom-right rectangle (front)
  ctx.beginPath();
  ctx.rect(-size * 0.5 + offset, -size * 0.5 + offset, size, size);
  ctx.stroke();
}

function drawMenuIcon(ctx: CanvasRenderingContext2D, width: number, scale: number) {
  const height = 2 * scale;
  const spacing = 6 * scale;

  ctx.fillStyle = ctx.strokeStyle;

  for (let i = -1; i <= 1; i++) {
    const y = i * spacing;
    ctx.beginPath();
    ctx.rect(-width * 0.5, y - height * 0.5, width, height);
    ctx.fill();
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
