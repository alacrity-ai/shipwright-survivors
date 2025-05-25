// src/ui/primitives/UILabel.ts

type LabelSegment = {
  text: string;
  color?: string;
};

type LabelInput = string | LabelSegment[];

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: LabelInput,
  options?: { font?: string; align?: CanvasTextAlign }
) {
  ctx.font = options?.font ?? '12px sans-serif';
  ctx.textAlign = options?.align ?? 'left';
  ctx.textBaseline = 'top';

  if (typeof text === 'string') {
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x, y);
    return;
  }

  let cursorX = x;
  for (const segment of text) {
    ctx.fillStyle = segment.color ?? '#fff';
    ctx.fillText(segment.text, cursorX, y);
    cursorX += ctx.measureText(segment.text).width;
  }
}
