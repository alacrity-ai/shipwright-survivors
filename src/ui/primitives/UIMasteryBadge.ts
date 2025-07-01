// src/ui/primitives/UIMasteryBadge.ts

export function drawMasteryLevel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  level: number,
  scale: number = 1.0
): void {
  const radius = 16 * scale;

  // === Define styles by level ===
  const styles: Record<number, { fill: string; border: string; text: string }> = {
    1: { fill: '#222222', border: '#444444', text: '#ffffff' },
    2: { fill: '#114422', border: '#228833', text: '#ffffff' },
    3: { fill: '#113366', border: '#2255aa', text: '#ffffff' },
    4: { fill: '#331155', border: '#662288', text: '#ffffff' },
    5: { fill: '#664400', border: '#ffaa00', text: '#ffffff' },
  };

  const style = styles[level] ?? styles[1];

  ctx.save();

  // === Draw filled circle ===
  const centerX = x;
  const centerY = y;
  const gradient = ctx.createRadialGradient(centerX, centerY, 2 * scale, centerX, centerY, radius);
  gradient.addColorStop(0, style.fill);
  gradient.addColorStop(1, '#000000');

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // === Stroke border ===
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = style.border;
  ctx.stroke();

  // === Draw level number ===
  ctx.font = `${Math.round(14 * scale)}px monospace`;
  ctx.fillStyle = style.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  // Optional: Draw bold stroke outline
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(String(level), centerX, centerY);

  ctx.fillText(String(level), centerX, centerY);

  ctx.restore();
}
