interface CRTTextStyle {
  font?: string;
  color?: string;
  glow?: boolean;
  chromaticAberration?: boolean;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
}

export function drawCRTText(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  style: CRTTextStyle = {}
): void {
  const {
    font = '14px "Courier New", monospace',
    color = '#00ff41',
    glow = true,
    chromaticAberration = true,
    align = 'left',
    baseline = 'top'
  } = style;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
  }

  // Chromatic offset passes
  if (chromaticAberration) {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ff0000';
    ctx.fillText(text, x - 0.5, y);
    ctx.fillStyle = '#0000ff';
    ctx.fillText(text, x + 0.5, y);
    ctx.restore();
  }

  ctx.globalAlpha = 1.0;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
