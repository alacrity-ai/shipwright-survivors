// src/rendering/helpers/drawEnergyRing.ts

// export function drawEnergyRing(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, radius: number, color: string): void {
//   ctx.save();
//   ctx.beginPath();
//   ctx.strokeStyle = color;
//   ctx.globalAlpha = 0.85;
//   ctx.lineWidth = 2;
//   ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
//   ctx.stroke();
//   ctx.restore();
// }


// export function drawEnergyRing(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, radius: number, color: string): void {
//   ctx.save();
//   // Clear ctx
//   ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

//   // Draw outer circle
//   ctx.beginPath();
//   ctx.fillStyle = color;
//   ctx.globalAlpha = 0.85;
//   ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
//   ctx.fill();
  
//   // Cut out inner circle to create ring effect
//   ctx.globalCompositeOperation = 'destination-out';
//   ctx.beginPath();
//   ctx.arc(screenX, screenY, radius - 8, 0, Math.PI * 2); // Inner radius
//   ctx.fill();
  
//   ctx.restore();
// }

export function drawEnergyRing(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  radius: number,
  color: string
): void {
  ctx.save();

  // Fully clear all pixels, including alpha
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const ringWidth = radius * 0.35;
  const innerRadius = radius - ringWidth;

  // === Draw Glow Halo ===
  const glowGradient = ctx.createRadialGradient(screenX, screenY, innerRadius, screenX, screenY, radius * 1.5);
  glowGradient.addColorStop(0.0, hexToRgba(color, 0.3));
  glowGradient.addColorStop(0.7, hexToRgba(color, 0.1));
  glowGradient.addColorStop(1.0, hexToRgba(color, 0.0));

  ctx.beginPath();
  ctx.fillStyle = glowGradient;
  ctx.arc(screenX, screenY, radius * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // === Draw Solid Outer Ring ===
  ctx.beginPath();
  ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // === Cut Out the Inner Circle ===
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(screenX, screenY, innerRadius, 0, Math.PI * 2);
  ctx.fill();

  // === Reset compositing for additional accents (optional) ===
  ctx.globalCompositeOperation = 'source-over';

  // Add subtle white highlight ring
  ctx.beginPath();
  ctx.arc(screenX, screenY, radius - ringWidth * 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = hexToRgba('#FFFFFF', 0.2);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  const parsed = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!parsed) return hex;
  const r = parseInt(parsed[1], 16);
  const g = parseInt(parsed[2], 16);
  const b = parseInt(parsed[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

