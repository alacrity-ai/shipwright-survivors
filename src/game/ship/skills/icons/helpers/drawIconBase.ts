// src/game/ship/skills/icons/helpers/drawIconBase.ts

export function drawIconBase(
  ctx: CanvasRenderingContext2D,
  color: string,
  shapeDrawer: (ctx: CanvasRenderingContext2D) => void,
  mode: 'fill' | 'stroke' = 'fill',
  outline: boolean = false
): void {
  ctx.shadowBlur = 8;
  ctx.shadowColor = color;

  if (mode === 'fill') {
    ctx.fillStyle = color;
    shapeDrawer(ctx);
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    shapeDrawer(ctx);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  if (outline) {
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    shapeDrawer(ctx);
    ctx.stroke();
  }
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
