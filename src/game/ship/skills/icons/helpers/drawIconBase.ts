// src/game/ship/skills/icons/helpers/drawIconBase.ts

export function drawIconBase(
  ctx: CanvasRenderingContext2D,
  backgroundColor: string,
  shapeDrawer: (ctx: CanvasRenderingContext2D) => void
): void {
  ctx.shadowBlur = 8;
  ctx.shadowColor = backgroundColor;
  ctx.fillStyle = backgroundColor;
  shapeDrawer(ctx);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  shapeDrawer(ctx);
  ctx.stroke();
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
