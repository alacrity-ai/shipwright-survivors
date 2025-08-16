import { CoachMarkEntity, CoachMarkPositionResolver } from '@/rendering/coachmarks/CoachMarkEntity';
import type { ArrowCoachMarkBehavior } from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';
import { getUniformScaleFactor } from '@/config/view';

// Optional, non-breaking styling keys (read via 'as any' to avoid type drift)
//   borderColor?: string
//   fillColor?: string          // fill of the arrow head
//   glowColor?: string          // outer neon glow color (defaults to arrowColor)
//   lineWidth?: number          // base line width in CSS px (pre-scale)
//   headLengthRatio?: number    // fraction of arrowLength, default 0.28
//   headMinPx?: number          // scaled min head length (px)
//   headMaxPx?: number          // scaled max head length (px)
//   floatAmpPx?: number         // vertical float amplitude (px)
//   pulseGlow?: boolean         // breathe the glow subtly

export class ArrowCoachMark extends CoachMarkEntity {
  protected behavior: ArrowCoachMarkBehavior;
  private t = 0; // animation timer

  constructor(getPos: CoachMarkPositionResolver, behavior: ArrowCoachMarkBehavior) {
    super(getPos, behavior);
    this.behavior = behavior;
  }

  override update(dt: number): void {
    super.update(dt);
    this.t += dt;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    const pos = this.getPosition();
    const scale = getUniformScaleFactor();

    // ——— Inputs & derived metrics ———
    const angle = this.resolveArrowRotationFromDown();
    const len   = Math.max(0, (this.behavior.arrowLength ?? 30) * scale);

    // Tunables with sensible defaults; read optional style keys if provided.
    const B = this.behavior as any;
    const arrowColor     = this.behavior.arrowColor ?? '#FFFFFF';
    const borderColor    = B.borderColor ?? arrowColor;
    const fillColor      = B.fillColor ?? arrowColor;
    const glowColorBase  = B.glowColor ?? arrowColor;
    const lineWidth      = (B.lineWidth ?? 2) * scale;

    const headLenRatio   = clamp(B.headLengthRatio ?? 0.28, 0.15, 0.45);
    const headMin        = (B.headMinPx ?? 6)  * scale;
    const headMax        = (B.headMaxPx ?? 18) * scale;

    const floatAmp       = (B.floatAmpPx ?? 5) * scale;
    const floatY         = Math.sin(this.t * 2 * Math.PI) * floatAmp;

    const glowPulseOn    = !!B.pulseGlow;
    const glowPulse      = glowPulseOn ? 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(this.t * 2 * Math.PI)) : 1.0;

    // Head geometry
    const headLen = clamp(len * headLenRatio, headMin, headMax);
    const shaftLen = Math.max(len - headLen, 0);
    const headHalfWidth = headLen * 0.55; // slightly narrower than length for minimalist chevron

    // ——— Coordinate system: draw along +Y, then rotate ———
    const x = pos.x * scale;
    const y = (pos.y + floatY) * scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ——— Neon glow pass (subtle, restrained) ———
    // Wide, faint stroke behind everything for a soft halo
    ctx.save();
    ctx.strokeStyle = applyAlpha(glowColorBase, 0.20 * glowPulse);
    ctx.lineWidth = Math.max(lineWidth * 2.5, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, shaftLen);
    ctx.stroke();

    // Head glow (triangle outline path expanded)
    ctx.beginPath();
    // Define head triangle at the tip (shaftLen..len)
    // Tip at (0, len)
    ctx.moveTo(0, len);
    ctx.lineTo(-headHalfWidth, len - headLen);
    ctx.lineTo( headHalfWidth, len - headLen);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // ——— Shaft: inner outline ———
    // Use a two-pass outline for crispness: outer faint stroke -> inner solid
    ctx.save();
    // Outer subtle edge
    ctx.strokeStyle = applyAlpha(borderColor, 0.35);
    ctx.lineWidth = lineWidth + Math.max(1, 1 * scale);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, shaftLen);
    ctx.stroke();

    // Inner solid line
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, shaftLen);
    ctx.stroke();
    ctx.restore();

    // ——— Head: filled minimalist triangle + outline ———
    ctx.save();
    // Fill
    ctx.fillStyle = applyAlpha(fillColor, 0.90);
    ctx.beginPath();
    ctx.moveTo(0, len);                         // tip
    ctx.lineTo(-headHalfWidth, len - headLen);  // left base
    ctx.lineTo( headHalfWidth, len - headLen);  // right base
    ctx.closePath();
    ctx.fill();

    // Outline (double-pass for clarity)
    ctx.strokeStyle = applyAlpha(borderColor, 0.35);
    ctx.lineWidth = lineWidth + Math.max(1, 1 * scale);
    ctx.stroke();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // Replace resolveArrowAngle() with this:
  private resolveArrowRotationFromDown(): number {
    switch (this.behavior.arrowDirection) {
      case 'down':  return 0;                 // base geometry already points down (+Y)
      case 'left':  return  Math.PI / 2;      // rotate clockwise +90°
      case 'up':    return  Math.PI;          // rotate 180°
      case 'right': return -Math.PI / 2;      // rotate counter-clockwise 90°
      default:      return 0;
    }
  }
}

// ——— Utilities ———
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function applyAlpha(hexColor: string, alpha: number): string {
  const a = clamp(alpha, 0, 1);
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}
