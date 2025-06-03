// src/ui/primitives/UILabel.ts

type LabelSegment = {
  text: string;
  color?: string;
};

type LabelInput = string | LabelSegment[];

interface LabelDrawOptions {
  font?: string;
  align?: CanvasTextAlign;
  alpha?: number;
  shadowBlur?: number;
  shadowColor?: string;
  glow?: boolean;    // shorthand for green glow
  color?: string;    // fallback or default color
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: LabelInput,
  options?: LabelDrawOptions
) {
  const {
    font = '12px monospace',
    align = 'left',
    alpha = 1.0,
    shadowBlur = 0,
    shadowColor = '',
    glow = false,
    color = '#00ff00' // ✅ NEW default
  } = options ?? {};

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';

  if (glow) {
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#00ff00';
  } else if (shadowBlur > 0 && shadowColor) {
    ctx.shadowBlur = shadowBlur;
    ctx.shadowColor = shadowColor;
  }

  if (typeof text === 'string') {
    ctx.fillStyle = color; // respect options.color
    ctx.fillText(text, x, y);
  } else {
    let cursorX = x;
    for (const segment of text) {
      ctx.fillStyle = segment.color ?? color;
      ctx.fillText(segment.text, cursorX, y);
      cursorX += ctx.measureText(segment.text).width;
    }
  }

  ctx.restore();
}
