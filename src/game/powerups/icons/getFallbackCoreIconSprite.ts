// src/game/powerups/icons/getFallbackCoreIconSprite.ts

export function getFallbackCoreIconSprite(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d')!;
  const cx = 12;
  const cy = 12;

  // === Outer ring glow ===
  const ringGradient = ctx.createRadialGradient(cx, cy, 4, cx, cy, 12);
  ringGradient.addColorStop(0, '#00ffff');
  ringGradient.addColorStop(0.5, '#0088ff');
  ringGradient.addColorStop(1, '#004488');

  ctx.fillStyle = ringGradient;
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();

  // === Inner core ===
  const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6);
  coreGradient.addColorStop(0, '#ffffff');
  coreGradient.addColorStop(0.4, '#00ffff');
  coreGradient.addColorStop(1, '#0066cc');

  ctx.fillStyle = coreGradient;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();

  // === Energy dot ===
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();

  // === Outline ===
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#003344';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}