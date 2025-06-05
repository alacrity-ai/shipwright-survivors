// src/game/ship/utils/drawShockwave.ts

/**
 * Draws a soft, slow-propagating shockwave effect
 * @param ctx - Canvas 2D context
 * @param centerX - X coordinate of the shockwave center (in screen space)
 * @param centerY - Y coordinate of the shockwave center (in screen space)
 * @param progress - Animation progress from 0 (start) to 1 (end)
 * @param maxRadius - Maximum radius the shockwave will reach
 * @param color - Base color for the shockwave (default: blue)
 * @param thickness - Thickness of the shockwave ring (default: 20)
 */
export function drawShockwave(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  progress: number,
  maxRadius: number = 200,
  color: string = '#00AAFF',
  thickness: number = 20
): void {
  // Clamp progress to 0-1
  progress = Math.max(0, Math.min(1, progress));

  const baseColor = color;
  const currentRadius = progress * maxRadius;

  const numRings = 2;
  const ringStagger = 0.35; // Increased to space out ring propagation
  const ringFalloff = 0.5;  // Softens alpha falloff

  for (let i = 0; i < numRings; i++) {
    const delay = i * ringStagger;
    const ringProgress = Math.max(0, (progress - delay) / (1 - delay));

    if (ringProgress <= 0) continue;

    const radius = ringProgress * maxRadius;
    const alpha = Math.pow(1 - ringProgress, 1.5) * (1 - i * ringFalloff); // Soft fade
    if (alpha <= 0.01) continue;

    const gradient = ctx.createRadialGradient(
      centerX, centerY, Math.max(0, radius - thickness),
      centerX, centerY, radius + thickness
    );

    const [r, g, b] = hexToRgb(baseColor);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.8).toFixed(3)})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Central flash: slower fade, slightly larger
  if (progress < 0.4) {
    const flashProgress = progress / 0.4;
    const flashAlpha = (1 - flashProgress) * 0.4;

    const flashGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, 40
    );

    const [r, g, b] = hexToRgb(baseColor);
    flashGradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha.toFixed(3)})`);
    flashGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${(flashAlpha * 0.6).toFixed(3)})`);
    flashGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = flashGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Converts a hex color string to RGB triplet.
 * Example: "#00AAFF" -> [0, 170, 255]
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 170, 255]; // Default to original blue
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}
