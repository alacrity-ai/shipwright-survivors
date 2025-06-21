import { BLOCK_SIZE } from '@/config/view';

/**
 * Renders a shaded, asymmetrical rock block.
 * Intended for asteroid-type environmental objects.
 */
export function drawRoundedRock(ctx: CanvasRenderingContext2D): void {
  const radius = BLOCK_SIZE / 2 - 2;
  const cx = BLOCK_SIZE / 2;
  const cy = BLOCK_SIZE / 2;

  ctx.save();

  // Base rock fill
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius + 3);
  ctx.bezierCurveTo(cx + 12, cy - radius, cx + radius, cy - 10, cx + radius - 2, cy);
  ctx.bezierCurveTo(cx + radius, cy + 10, cx + 10, cy + radius - 4, cx, cy + radius);
  ctx.bezierCurveTo(cx - 10, cy + radius - 6, cx - radius, cy + 10, cx - radius + 2, cy);
  ctx.bezierCurveTo(cx - radius, cy - 10, cx - 10, cy - radius, cx, cy - radius + 3);
  ctx.closePath();
  ctx.fill();

  // Optional texture speckles
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * BLOCK_SIZE;
    const y = Math.random() * BLOCK_SIZE;
    ctx.beginPath();
    ctx.arc(x, y, 1 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
