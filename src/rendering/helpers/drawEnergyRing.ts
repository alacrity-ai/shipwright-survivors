import { CanvasManager } from '@/core/CanvasManager';

// TODO : Refactor to webgl

export function drawEnergyRing(screenX: number, screenY: number, radius: number, color: string): void {
  const ctx = CanvasManager.getInstance().getContext('entities'); // Or your target layer

  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2;
  ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
