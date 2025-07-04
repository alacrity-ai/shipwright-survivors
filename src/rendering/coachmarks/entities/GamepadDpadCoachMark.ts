import {
  CoachMarkEntity,
  CoachMarkPositionResolver
} from '@/rendering/coachmarks/CoachMarkEntity';
import type {
  GamepadDPadCoachMarkBehavior,
  DPadDirection
} from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';
import { getUniformScaleFactor } from '@/config/view';

export class GamepadDPadCoachMark extends CoachMarkEntity {
  protected behavior: GamepadDPadCoachMarkBehavior;
  private animationTimer = 0;

  constructor(getPos: CoachMarkPositionResolver, behavior: GamepadDPadCoachMarkBehavior) {
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

    const size = (this.behavior.size ?? 60) * scale;
    const arrowSize = size * 0.3;
    const spacing = size * 0.5;

    const borderColor = this.behavior.borderColor ?? '#FFFFFF';
    const fillColor = this.behavior.fillColor ?? '#222222';
    const highlightColor = this.behavior.highlightColor ?? '#00FFFF';
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTimer * Math.PI * 2); // 0–1

    const isHighlighted = (dir: DPadDirection): boolean =>
      this.behavior.highlightDirections?.includes(dir) ?? false;

    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 2 * scale;

    // === Draw DPad Base ===
    ctx.beginPath();
    ctx.strokeStyle = borderColor;
    ctx.fillStyle = fillColor;
    ctx.roundRect(-size / 2, -size / 2, size, size, 8);
    ctx.fill();
    ctx.stroke();

    // === Helper to draw directional arrows ===
    const drawArrow = (
      dx: number,
      dy: number,
      dir: DPadDirection
    ): void => {
      ctx.save();
      ctx.translate(dx * spacing, dy * spacing);

      // === Directional rotation in radians ===
      const angleMap: Record<DPadDirection, number> = {
        up: 0,
        right: Math.PI / 2,
        down: Math.PI,
        left: -Math.PI / 2,
      };
      ctx.rotate(angleMap[dir]);

      ctx.beginPath();
      ctx.moveTo(0, -arrowSize / 2);           // Tip of arrow
      ctx.lineTo(arrowSize / 2, arrowSize / 2);
      ctx.lineTo(-arrowSize / 2, arrowSize / 2);
      ctx.closePath();

      ctx.fillStyle = isHighlighted(dir)
        ? applyAlpha(highlightColor, pulse)
        : '#444444';

      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.stroke();
      ctx.restore();
    };

    drawArrow(0, -1, 'up');
    drawArrow(0, 1, 'down');
    drawArrow(-1, 0, 'left');
    drawArrow(1, 0, 'right');

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
